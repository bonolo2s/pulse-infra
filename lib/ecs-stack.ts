import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class PulseEcsStack extends cdk.Stack {
    public readonly cluster: ecs.Cluster;
    public readonly loadBalancerDnsName: string;
    public readonly securityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: cdk.StackProps & { vpc: ec2.Vpc }) {
        super(scope, id, props);

        this.securityGroup = new ec2.SecurityGroup(this, 'PulseEcsSG', {
            vpc: props.vpc,
            description: 'Security group for Pulse ECS',
            allowAllOutbound: true,
        });

        this.cluster = new ecs.Cluster(this, 'PulseCluster', {
            vpc: props.vpc,
        });

        this.cluster.addCapacity('PulseEc2Capacity', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            minCapacity: 1,
            maxCapacity: 1,
        });

        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'PulseTaskDef');

        const repository = ecr.Repository.fromRepositoryName(this, 'PulseRepo', 'pulse-api');

        taskDefinition.addContainer('PulseApiContainer', {
            image: ecs.ContainerImage.fromEcrRepository(repository),
            memoryLimitMiB: 512,
            cpu: 256,
            portMappings: [{ containerPort: 8080 }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'pulse-api' }),
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
        });

        const listener = alb.addListener('PulseListener', {
            port: 80,
        });

        listener.addTargets('PulseTarget', {
            port: 8080,
            targets: [service],
            healthCheck: { path: '/health' },
        });

        this.loadBalancerDnsName = alb.loadBalancerDnsName;
    }
}