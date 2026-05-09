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

const PulseVpcStack_instance = new PulseVpcStack(app, 'PulseVpcStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

new PulseEcsStack(app, 'PulseEcsStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  vpc: PulseVpcStack_instance.vpc,
});

new PulseRdsStack(app, 'PulseRdsStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  vpc: PulseVpcStack_instance.vpc,
});

new PulseElastiCacheStack(app, 'PulseElastiCacheStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  vpc: PulseVpcStack_instance.vpc,
});

const pulseLambdaStack = new PulseLambdaStack(app, 'PulseLambdaStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  vpc: PulseVpcStack_instance.vpc,
});

new EventBridgeStack(app, 'PulseEventBridgeStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  healthCheckFunction: pulseLambdaStack.healthCheckFunction,
});

new PulseApiGatewayStack(app, 'PulseApiGatewayStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

new PulseSnsStack(app, 'PulseSnsStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

new PulseSesStack(app, 'PulseSesStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

new PulseObservabilityStack(app, 'PulseObservabilityStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

cdk.Tags.of(app).add('Project', 'Pulse');