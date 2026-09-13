import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

interface PulseSqsStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'prod';
    alertTopic: sns.ITopic;
}

export class PulseSqsStack extends cdk.Stack {
    public readonly recordResultsQueue: sqs.Queue;
    public readonly notificationsQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props: PulseSqsStackProps) {
        super(scope, id, props);

        this.recordResultsQueue = new sqs.Queue(this, 'PulseRecordResultsQueue', {
            queueName: `pulse-record-results-queue-${props.environment}`,
        });

        this.notificationsQueue = new sqs.Queue(this, 'PulseNotificationsQueue', {
            queueName: `pulse-notifications-queue-${props.environment}`,
        });

        props.alertTopic.addSubscription(new subscriptions.SqsSubscription(this.recordResultsQueue));
        props.alertTopic.addSubscription(new subscriptions.SqsSubscription(this.notificationsQueue));
    }
}