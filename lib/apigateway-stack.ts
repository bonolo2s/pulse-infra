import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class PulseApiGatewayStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { albDnsName: string }) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, 'PulseApi', {
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

        const integration = new apigateway.HttpIntegration(
            `http://${props.albDnsName}/{proxy}`,
            { httpMethod: 'ANY', proxy: true }
        );

        // Proxy all traffic to ECS
        api.root.addProxy({
            defaultIntegration: integration,
            anyMethod: true,
        });

        // Rate limit login
        const identity = api.root.addResource('api').addResource('identity');
        const login = identity.addResource('login');
        login.addMethod('POST', integration, {
            methodResponses: [{ statusCode: '200' }],
        });

        // Rate limit public status pages
        const statusPages = api.root.addResource('s');
        const slug = statusPages.addResource('{slug}');
        slug.addMethod('GET', integration, {
            methodResponses: [{ statusCode: '200' }],
        });
    }
}