#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PulseVpcStack } from '../lib/vpc-stack'; 
const app = new cdk.App();

new PulseVpcStack(app, 'PulseVpcStack', {
  env: { account: '881005428470', region: 'eu-west-1' },
});