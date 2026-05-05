import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class PulseSnsStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.alertTopic = new sns.Topic(this, 'PulseAlertTopic', {
      topicName: 'pulse-alerts',
      displayName: 'Pulse Alert Notifications',
    });
  }
}