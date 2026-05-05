#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PulseVpcStack } from '../lib/vpc-stack';
import { PulseEcsStack } from '../lib/ecs-stack';
import { PulseRdsStack } from '../lib/rds-stack';

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