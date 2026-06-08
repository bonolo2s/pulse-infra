import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class PulseRdsStack extends cdk.Stack {
  public readonly db: rds.DatabaseInstance;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps & { vpc: ec2.Vpc }) {
    super(scope, id, props);

    this.securityGroup = new ec2.SecurityGroup(this, 'PulseRdsSG', {
      vpc: props.vpc,
      description: 'Security group for Pulse RDS',
      allowAllOutbound: false,
    });

    this.db = new rds.DatabaseInstance(this, 'PulsePostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      multiAz: false,
      allocatedStorage: 20,
      deletionProtection: false,
    });
  }
}