import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface PulseSecurityGroupsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseSecurityGroupsStack extends cdk.Stack {
    public readonly ecsSg: ec2.SecurityGroup;
    public readonly rdsSg: ec2.SecurityGroup;
    public readonly albSg: ec2.SecurityGroup;
    public readonly lambdaSg: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: PulseSecurityGroupsStackProps) {
        super(scope, id, props);

        const isProd = props.environment === 'prod';

        this.ecsSg = new ec2.SecurityGroup(this, 'PulseEcsSG', {
            vpc: props.vpc,
            description: `Security group for Pulse ECS (${props.environment})`,
        });

        this.rdsSg = new ec2.SecurityGroup(this, 'PulseRdsSG', {
            vpc: props.vpc,
            description: `Security group for Pulse RDS (${props.environment})`,
            allowAllOutbound: false,
        });

        this.albSg = new ec2.SecurityGroup(this, 'PulseAlbSG', {
            vpc: props.vpc,
            description: `Security group for Pulse ALB (${props.environment})`,
        });

        this.lambdaSg = new ec2.SecurityGroup(this, 'PulseLambdaSG', {
            vpc: props.vpc,
            description: `Security group for Pulse Lambda (${props.environment})`,
        });

        this.rdsSg.addIngressRule(this.ecsSg, ec2.Port.tcp(5432), 'Allow ECS to connect to PostgreSQL');
        this.rdsSg.addIngressRule(this.lambdaSg, ec2.Port.tcp(5432), 'Allow Lambda to connect to PostgreSQL');

        this.albSg.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(isProd ? 443 : 80),
            'Allow internet traffic to ALB'
        );

        this.ecsSg.addIngressRule(this.albSg, ec2.Port.tcp(8080), 'Allow ALB to reach ECS');
    }
}