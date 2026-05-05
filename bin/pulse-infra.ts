#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PulseVpcStack } from '../lib/vpc-stack';
import { PulseEcsStack } from '../lib/ecs-stack';

const app = new cdk.App();

const pulseVpcStack = new PulseVpcStack(app, 'PulseVpcStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});

new PulseEcsStack(app, 'PulseEcsStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
  vpc: pulseVpcStack.vpc,
});