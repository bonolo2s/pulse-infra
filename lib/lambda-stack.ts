import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

interface PulseLambdaStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseLambdaStack extends cdk.Stack {
    public readonly healthCheckFunction: lambda.DockerImageFunction;

    constructor(scope: Construct, id: string, props: PulseLambdaStackProps) {
        super(scope, id, props);

        const repository = ecr.Repository.fromRepositoryName(this, 'PulseLambdaRepo', 'pulse-lambda');

        this.healthCheckFunction = new lambda.DockerImageFunction(this, 'PulseHealthCheck', {
            code: lambda.DockerImageCode.fromEcr(repository, { tagOrDigest: 'lambda-v1' }),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            allowPublicSubnet: true,
            timeout: cdk.Duration.seconds(30),
            environment: {
                ENVIRONMENT: props.environment,
            },
        });
    }
}