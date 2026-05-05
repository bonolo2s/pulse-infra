import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';
import 'dotenv/config';

export class PulseSesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const email = process.env.PULSE_ALERT_EMAIL;
    if (!email) throw new Error('PULSE_ALERT_EMAIL is not set in .env');

    new ses.EmailIdentity(this, 'PulseSesIdentity', {
    identity: ses.Identity.email(email),
    });
  }
}