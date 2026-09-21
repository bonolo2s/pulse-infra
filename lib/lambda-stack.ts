import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface PulseLambdaStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
    securityGroup: ec2.SecurityGroup;
    alertTopicArn: string;
    db: rds.DatabaseInstance;
}

export class PulseLambdaStack extends cdk.Stack {
    public readonly healthCheckFunction: lambda.DockerImageFunction;

    constructor(scope: Construct, id: string, props: PulseLambdaStackProps) {
        super(scope, id, props);

        const repository = ecr.Repository.fromRepositoryName(this, 'PulseLambdaRepo', 'pulse-lambda');

        this.healthCheckFunction = new lambda.DockerImageFunction(this, 'PulseHealthCheck', {
            code: lambda.DockerImageCode.fromEcr(repository, { tagOrDigest: 'lambda-v1' }),
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [props.securityGroup],
            timeout: cdk.Duration.seconds(30),
            environment: {
                ENVIRONMENT: props.environment,
                DB__HOST: props.db.dbInstanceEndpointAddress,
                DB__PORT: props.db.dbInstanceEndpointPort,
                DB__DATABASE: 'pulse',
                DB__USERNAME: 'postgres',
                DB__PASSWORDPARAMETERNAME: '/pulse/staging/db-password',
                AWS__SNS__ALERTTOPICARN: props.alertTopicArn,
            },
        });

        this.healthCheckFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['sns:Publish'],
            resources: [props.alertTopicArn],
        }));

        ssm.StringParameter.fromSecureStringParameterAttributes(this, 'DbPasswordParam', {
            parameterName: '/pulse/staging/db-password',
        }).grantRead(this.healthCheckFunction);
    }
}