import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

export class PulseElastiCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & { vpc: ec2.Vpc }) {
    super(scope, id, props);

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'PulseRedisSubnetGroup', {
      description: 'Subnet group for Pulse Redis',
      subnetIds: props.vpc.isolatedSubnets.map(s => s.subnetId),
    });

    new elasticache.CfnCacheCluster(this, 'PulseRedis', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: subnetGroup.ref,
    });
  }
}