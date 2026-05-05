import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export class PulseEcsStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: cdk.StackProps & { vpc: ec2.Vpc }) {
    super(scope, id, props);

    this.cluster = new ecs.Cluster(this, 'PulseCluster', {
      vpc: props.vpc,
    });

    this.cluster.addCapacity('PulseEc2Capacity', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      minCapacity: 1,
      maxCapacity: 1,
    });
  }
}