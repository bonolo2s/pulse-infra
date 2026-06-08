import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface PulseObservabilityStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseObservabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PulseObservabilityStackProps) {
    super(scope, id, props);

    new s3.Bucket(this, 'PulseLogsBucket', {
      bucketName: `pulse-logs-${props.environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cloudwatch.Dashboard(this, 'PulseDashboard', {
      dashboardName: `PulseMonitoring-${props.environment}`,
    });
  }
}