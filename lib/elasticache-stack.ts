import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface PulseElastiCacheStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseElastiCacheStack extends cdk.Stack {
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly cluster: elasticache.CfnCacheCluster;

  constructor(scope: Construct, id: string, props: PulseElastiCacheStackProps) {
    super(scope, id, props);

    this.securityGroup = new ec2.SecurityGroup(this, 'PulseRedisSG', {
      vpc: props.vpc,
      description: `Security group for Pulse Redis (${props.environment})`,
      allowAllOutbound: false,
    });

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'PulseRedisSubnetGroup', {
      description: `Subnet group for Pulse Redis (${props.environment})`,
      subnetIds: props.vpc.privateSubnets.map(s => s.subnetId), // Grabs the IDs of all my private subnets so ElastiCache knows exactly which ones it's allowed to live in.
    });

    this.cluster = new elasticache.CfnCacheCluster(this, `PulseRedis-${props.environment}`, {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
    });
  }
}