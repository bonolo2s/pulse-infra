import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class PulseLambdaStack extends cdk.Stack {
    public readonly healthCheckFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: cdk.StackProps & { vpc: ec2.Vpc }) {
        super(scope, id, props);

        this.healthCheckFunction = new lambda.Function(this, 'PulseHealthCheck', {
            runtime: lambda.Runtime.DOTNET_9,
            handler: 'Pulse.Lambda::Pulse.Lambda.HealthCheckFunction::FunctionHandler',
            code: lambda.Code.fromBucket(
                s3.Bucket.fromBucketName(this, 'LambdaBucket', 'pulse-logs-881005428470'),
                'lambda/lambda.zip'
            ),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            allowPublicSubnet: true,
            timeout: cdk.Duration.seconds(30),
        });
    }
}