import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface PulseEcsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
    alertTopicArn: string;
    recordResultsQueueArn: string;
    notificationsQueueArn: string;
}

export class PulseEcsStack extends cdk.Stack {
    public readonly cluster: ecs.Cluster;
    public readonly loadBalancerDnsName: string;
    public readonly securityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: PulseEcsStackProps) {
        super(scope, id, props);

        const isProd = props.environment === 'prod';

        this.securityGroup = new ec2.SecurityGroup(this, 'PulseEcsSG', {
            vpc: props.vpc,
            description: `Security group for Pulse ECS (${props.environment})`,
        });

        const albSecurityGroup = new ec2.SecurityGroup(this, 'PulseAlbSG', {
            vpc: props.vpc,
            description: `Security group for Pulse ALB (${props.environment})`,
        });

        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(isProd ? 443 : 80),
            'Allow internet traffic to ALB'
        );

        this.securityGroup.addIngressRule(
            albSecurityGroup,
            ec2.Port.tcp(8080),
            'Allow ALB to reach ECS'
        );

        this.cluster = new ecs.Cluster(this, 'PulseCluster', {
            vpc: props.vpc,
        });

        this.cluster.addCapacity('PulseEc2Capacity', {
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T3,
                ec2.InstanceSize.MICRO
            ),
            minCapacity: 1,
            maxCapacity: isProd ? 4 : 1,
        });

        const repository = ecr.Repository.fromRepositoryName(
            this,
            'PulseRepo',
            'pulse-api'
        );

        // ECS infrastructure permissions
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
            image: ecs.ContainerImage.fromEcrRepository(repository),
            memoryLimitMiB: 512,
            cpu: 256,
            portMappings: [{ containerPort: 8080 }],
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: `pulse-api-${props.environment}`,
            }),
        });

        const service = new ecs.Ec2Service(this, 'PulseService', {
            cluster: this.cluster,
            taskDefinition,
            desiredCount: 1,
            securityGroups: [this.securityGroup],
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