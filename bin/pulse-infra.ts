#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PulseVpcStack } from '../lib/vpc-stack';
import { PulseEcsStack } from '../lib/ecs-stack';
import { PulseRdsStack } from '../lib/rds-stack';
import { PulseElastiCacheStack } from '../lib/elasticache-stack';
import { PulseLambdaStack } from '../lib/lambda-stack';
import { PulseApiGatewayStack } from '../lib/apigateway-stack';
import { PulseSnsStack } from '../lib/sns-stack';
import { PulseSesStack } from '../lib/ses-stack';
import { PulseObservabilityStack } from '../lib/observability-stack';
import { EventBridgeStack } from '../lib/eventbridge-stack';

const app = new cdk.App();

const environment = (app.node.tryGetContext('environment') ?? 'dev') as 'dev' | 'staging' | 'prod';
const account = app.node.tryGetContext('account') ?? process.env.CDK_DEFAULT_ACCOUNT;
const alertEmail = app.node.tryGetContext('alertEmail');

const env = { account, region: 'eu-west-1' };

// SNS + SES deployed for all environments
const snsStack = new PulseSnsStack(app, `${environment}-PulseSnsStack`, { env, environment });
new PulseSesStack(app, `${environment}-PulseSesStack`, { env, environment, alertEmail });

if (environment !== 'dev') {
    const vpcStack = new PulseVpcStack(app, `${environment}-PulseVpcStack`, { env, environment });

    new PulseRdsStack(app, `${environment}-PulseRdsStack`, { env, environment, vpc: vpcStack.vpc });

    new PulseElastiCacheStack(app, `${environment}-PulseElastiCacheStack`, { env, environment, vpc: vpcStack.vpc });

    const ecsStack = new PulseEcsStack(app, `${environment}-PulseEcsStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
    });

    const lambdaStack = new PulseLambdaStack(app, `${environment}-PulseLambdaStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
    });

    new EventBridgeStack(app, `${environment}-PulseEventBridgeStack`, {
        env,
        environment,
        healthCheckFunction: lambdaStack.healthCheckFunction,
    });

    new PulseApiGatewayStack(app, `${environment}-PulseApiGatewayStack`, {
        env,
        environment,
        albDnsName: ecsStack.loadBalancerDnsName,
    });

    new PulseObservabilityStack(app, `${environment}-PulseObservabilityStack`, { env, environment });
}

cdk.Tags.of(app).add('Project', 'Pulse');
cdk.Tags.of(app).add('Environment', environment);