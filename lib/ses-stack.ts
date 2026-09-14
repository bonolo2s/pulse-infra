import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

interface PulseSesStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'prod';
    alertEmail: string;
}

export class PulseSesStack extends cdk.Stack {
    public readonly identity: ses.EmailIdentity;

    constructor(scope: Construct, id: string, props: PulseSesStackProps) {
        super(scope, id, props);

        this.identity = new ses.EmailIdentity(
            this,
            `PulseSesIdentity-${props.environment}`,
            {
                identity: ses.Identity.email(props.alertEmail),
            }
        );
    }
}