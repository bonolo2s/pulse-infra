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
        });

        const integration = new apigateway.HttpIntegration(
            `http://${props.albDnsName}/{proxy}`,
            { httpMethod: 'ANY', proxy: true }
        );

        api.root.addProxy({
            defaultIntegration: integration,
            anyMethod: true,
        });

        const identity = api.root.addResource('api').addResource('identity');
        const login = identity.addResource('login');
        login.addMethod('POST', integration, {
            methodResponses: [{ statusCode: '200' }],
        });

        const statusPages = api.root.addResource('s');
        const slug = statusPages.addResource('{slug}');
        slug.addMethod('GET', integration, {
            methodResponses: [{ statusCode: '200' }],
        });

        const cfnStage = api.deploymentStage.node.defaultChild as apigateway.CfnStage;
        cfnStage.methodSettings = [
            {
                httpMethod: 'POST',
                resourcePath: '/api/identity/login',
                throttlingRateLimit: 2,
                throttlingBurstLimit: 1,
            },
            {
                httpMethod: 'GET',
                resourcePath: '/s/{slug}',
                throttlingRateLimit: 10,
                throttlingBurstLimit: 5,
            },
        ];
    }
}