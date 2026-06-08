import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface PulseSnsStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseSnsStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: PulseSnsStackProps) {
    super(scope, id, props);

    this.alertTopic = new sns.Topic(this, 'PulseAlertTopic', {
      topicName: `pulse-alerts-${props.environment}`,
      displayName: `Pulse Alert Notifications (${props.environment})`,
    });
  }
}