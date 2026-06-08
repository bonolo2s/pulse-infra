import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface EventBridgeStackProps extends cdk.StackProps {
    healthCheckFunction: lambda.IFunction;
    environment: 'dev' | 'staging' | 'prod';
}

export class EventBridgeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
        super(scope, id, props);

        const intervals = [
            { name: '1min',  schedule: events.Schedule.rate(cdk.Duration.minutes(1)),  seconds: 60 },
            { name: '5min',  schedule: events.Schedule.rate(cdk.Duration.minutes(5)),  seconds: 300 },
            { name: '10min', schedule: events.Schedule.rate(cdk.Duration.minutes(10)), seconds: 600 },
            { name: '15min', schedule: events.Schedule.rate(cdk.Duration.minutes(15)), seconds: 900 },
            { name: '30min', schedule: events.Schedule.rate(cdk.Duration.minutes(30)), seconds: 1800 },
            { name: '1hour', schedule: events.Schedule.rate(cdk.Duration.hours(1)),    seconds: 3600 },
        ];

        for (const interval of intervals) {
            new events.Rule(this, `HealthCheckRule-${interval.name}`, {
                schedule: interval.schedule,
                targets: [
                    new targets.LambdaFunction(props.healthCheckFunction, {
                        event: events.RuleTargetInput.fromObject({
                            intervalSeconds: interval.seconds,
                        }),
                    }),
                ],
                description: `Triggers health check Lambda every ${interval.name} (${props.environment})`,
            });
        }
    }
}