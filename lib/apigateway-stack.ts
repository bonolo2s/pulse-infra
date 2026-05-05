import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class PulseApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new apigateway.RestApi(this, 'PulseApi', {
      restApiName: 'Pulse API',
      description: 'API Gateway for Pulse endpoint monitoring platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      },
    });
  }
}