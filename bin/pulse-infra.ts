#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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
import { PulseSqsStack } from '../lib/sqs-stack';
import { PulseSecurityGroupsStack } from '../lib/security-groups-stack';

const app = new cdk.App();

const environment = (app.node.tryGetContext('environment') ?? 'dev') as 'dev' | 'staging' | 'prod';
const account = app.node.tryGetContext('account') ?? process.env.CDK_DEFAULT_ACCOUNT;
const alertEmail = app.node.tryGetContext('alertEmail');

const env = { account, region: 'eu-west-1' };

// SNS + SES deployed for all environments
const snsStack = new PulseSnsStack(app, `${environment}-PulseSnsStack`, { env, environment });
// new PulseSesStack(app, `${environment}-PulseSesStack`, { env, environment, alertEmail });

if (environment !== 'dev') {
    const vpcStack = new PulseVpcStack(app, `${environment}-PulseVpcStack`, { env, environment });

    const sgStack = new PulseSecurityGroupsStack(app, `${environment}-PulseSecurityGroupsStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
    });

    // new PulseElastiCacheStack(app, `${environment}-PulseElastiCacheStack`, { env, environment, vpc: vpcStack.vpc });

    const sqsStack = new PulseSqsStack(app, `${environment}-PulseSqsStack`, {
        env,
        environment,
        alertTopic: snsStack.alertTopic
    });
    
    const rdsStack = new PulseRdsStack(app, `${environment}-PulseRdsStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
        securityGroup: sgStack.rdsSg,
    });

    const ecsStack = new PulseEcsStack(app, `${environment}-PulseEcsStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
        securityGroup: sgStack.ecsSg,
        albSecurityGroup: sgStack.albSg,
        alertTopicArn: snsStack.alertTopic.topicArn,
        recordResultsQueueArn: sqsStack.recordResultsQueue.queueArn,
        recordResultsQueueUrl: sqsStack.recordResultsQueue.queueUrl,
        notificationsQueueArn: sqsStack.notificationsQueue.queueArn,
        notificationsQueueUrl: sqsStack.notificationsQueue.queueUrl,
        db: rdsStack.db,
    });

    const observabilityStack = new PulseObservabilityStack(app, `${environment}-PulseObservabilityStack`, { env, environment });

    const lambdaStack = new PulseLambdaStack(app, `${environment}-PulseLambdaStack`, {
        env,
        environment,
        vpc: vpcStack.vpc,
        securityGroup: sgStack.lambdaSg,
        alertTopicArn: snsStack.alertTopic.topicArn,
        db: rdsStack.db,
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
}

cdk.Tags.of(app).add('Project', 'Pulse');
cdk.Tags.of(app).add('Environment', environment);