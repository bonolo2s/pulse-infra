import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import { Construct } from 'constructs';

interface PulseEcsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
    securityGroup: ec2.SecurityGroup;
    albSecurityGroup: ec2.SecurityGroup;
    alertTopicArn: string;
    recordResultsQueueArn: string;
    recordResultsQueueUrl: string;
    notificationsQueueArn: string;
    notificationsQueueUrl: string;
    db: rds.DatabaseInstance;
}
export class PulseEcsStack extends cdk.Stack {
    public readonly cluster: ecs.Cluster;
    public readonly loadBalancerDnsName: string;
    public readonly securityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: PulseEcsStackProps) {
        super(scope, id, props);

        const isProd = props.environment === 'prod';

        this.securityGroup = props.securityGroup;

        const albSecurityGroup = props.albSecurityGroup;

        this.cluster = new ecs.Cluster(this, 'PulseCluster', {
            vpc: props.vpc,
        });

        const asg = new autoscaling.AutoScalingGroup(this, 'PulseEc2Capacity', {
            vpc: props.vpc,
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T3,
                ec2.InstanceSize.MICRO
            ),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            minCapacity: 1,
            maxCapacity: isProd ? 4 : 1,
            securityGroup: this.securityGroup,
        });

        const capacityProvider = new ecs.AsgCapacityProvider(this, 'PulseAsgCapacityProvider', {
            autoScalingGroup: asg,
        });

        this.cluster.addAsgCapacityProvider(capacityProvider);

        asg.role.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
        );

        this.cluster.connections.addSecurityGroup(this.securityGroup); // all resources under this cluster will use this security group ✔️ 

        const repository = ecr.Repository.fromRepositoryName(this, 'PulseRepo', 'pulse-api');

        // Permissions available for ecs agent in my ec2's
        const executionRole = new iam.Role(this, 'PulseEcsExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AmazonECSTaskExecutionRolePolicy'
                ),
            ],
        });

        // Permissions available to the Pulse API container
        const taskRole = new iam.Role(this, 'PulseEcsTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'sns:Publish',
            ],
            resources: [
                props.alertTopicArn,
            ],
        }));

        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
            ],
            resources: [
                props.recordResultsQueueArn,
                props.notificationsQueueArn,
            ],
        }));

        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
            ],
            resources: ['*'],
        }));

        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'PulseTaskDef', {
            executionRole,
            taskRole,
        });

        taskDefinition.addContainer('PulseApiContainer', {
            image: ecs.ContainerImage.fromEcrRepository(repository, 'api-v1'),
            memoryLimitMiB: 512,
            cpu: 256,
            portMappings: [{ containerPort: 8080 }],
            environment: {
                ConnectionStrings__DefaultConnection__Host: props.db.dbInstanceEndpointAddress,
                ConnectionStrings__DefaultConnection__Port: props.db.dbInstanceEndpointPort,
                ConnectionStrings__DefaultConnection__Database: 'pulse',
                ConnectionStrings__DefaultConnection__Username: 'postgres',
                ConnectionStrings__Redis: '',
                Aws__Region: 'eu-west-1',
                Aws__AccountId: '881005428470',
                Aws__Sns__AlertTopicArn: props.alertTopicArn,
                Aws__Sqs__RecordResultQueueUrl: props.recordResultsQueueUrl,
                Aws__Sqs__TriggerAlertQueueUrl: props.notificationsQueueUrl,
                Aws__Ses__FromAddress: 'noreply@pulse.dev',
                Paystack__CallbackUrl: 'https://pulse-endpoint-monitor.netlify.app/billing',
                Paystack__Plans__Pro: '450.00',
                Paystack__Plans__ProCode: 'PLN_v1fpreihyn4n1nt',
                Jwt__Issuer: 'Pulse',
                Jwt__Audience: 'PulseUsers',
                Jwt__ExpiryMinutes: '60',
                Jwt__RefreshTokenExpiryDays: '7',
                Billing__SweepIntervalMinutes: '5',
                Billing__RenewalSweepIntervalMinutes: '5',
                Billing__VerifyFallbackThresholdMinutes: '15',
                Billing__VerifyFallbackSweepIntervalMinutes: '5',
            },

            secrets: {
                ConnectionStrings__DefaultConnection__Password: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromSecureStringParameterAttributes(this, 'DbPasswordParam', {
                        parameterName: '/pulse/staging/db-password',
                    })
                ),
                Jwt__SecretKey: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromSecureStringParameterAttributes(this, 'JwtSecretParam', {
                        parameterName: '/pulse/staging/jwt-secret',
                    })
                ),
                Paystack__SecretKey: ecs.Secret.fromSsmParameter(
                    ssm.StringParameter.fromSecureStringParameterAttributes(this, 'PaystackSecretParam', {
                        parameterName: '/pulse/staging/paystack-secret',
                    })
                ),
            },
        });

        const service = new ecs.Ec2Service(this, 'PulseService', {
            cluster: this.cluster,
            taskDefinition,
            desiredCount: 1,// of my workers/containers
        });

        const alb = new elbv2.ApplicationLoadBalancer(this, 'PulseAlb', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: albSecurityGroup,
        });

        const listener = alb.addListener('PulseListener', {
            port: isProd ? 443 : 80,
        });

        listener.addTargets('PulseTarget', {
            port: 8080,
            targets: [service],
            healthCheck: { path: '/health' },
        });

        this.loadBalancerDnsName = alb.loadBalancerDnsName;
    }
}