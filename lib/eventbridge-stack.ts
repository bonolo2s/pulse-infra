import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface EventBridgeStackProps extends cdk.StackProps {
    healthCheckFunction: lambda.IFunction;
}

export class EventBridgeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
        super(scope, id, props);

        const intervals = [
            { name: '1min',  schedule: events.Schedule.rate(cdk.Duration.minutes(1)) },
            { name: '5min',  schedule: events.Schedule.rate(cdk.Duration.minutes(5)) },
            { name: '10min', schedule: events.Schedule.rate(cdk.Duration.minutes(10)) },
            { name: '15min', schedule: events.Schedule.rate(cdk.Duration.minutes(15)) },
            { name: '30min', schedule: events.Schedule.rate(cdk.Duration.minutes(30)) },
            { name: '1hour', schedule: events.Schedule.rate(cdk.Duration.hours(1)) },
        ];

        for (const interval of intervals) {
            new events.Rule(this, `HealthCheckRule-${interval.name}`, {
                schedule: interval.schedule,
                targets: [new targets.LambdaFunction(props.healthCheckFunction)],
                description: `Triggers health check Lambda every ${interval.name}`
            });
        }
    }
}