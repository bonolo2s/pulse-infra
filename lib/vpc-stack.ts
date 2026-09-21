import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface PulseVpcStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseVpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: PulseVpcStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, `PulseVpc-${props.environment}`, {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // gives default route to NAT gateway for internet access/ outbound.
          cidrMask: 24,
        },
      ],
    });
  }
}