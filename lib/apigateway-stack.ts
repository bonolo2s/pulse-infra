import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

interface PulseApiGatewayStackProps extends cdk.StackProps {
    albDnsName: string;
    environment: 'dev' | 'staging' | 'prod';
}

export class PulseApiGatewayStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PulseApiGatewayStackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, 'PulseApi', {
            restApiName: `Pulse API (${props.environment})`,
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

        const apiResource = api.root.addResource('api');

        const identity = apiResource.addResource('identity');
        const login = identity.addResource('login');
        login.addMethod('POST', integration, {
            methodResponses: [{ statusCode: '200' }],
        });

        const statuspages = apiResource.addResource('statuspages');
        const publicPages = statuspages.addResource('public');
        const slug = publicPages.addResource('{slug}');
        slug.addMethod('GET', integration, {
            methodResponses: [{ statusCode: '200' }],
        });

        const cfnStage = api.deploymentStage.node.defaultChild as apigateway.CfnStage;
        cfnStage.methodSettings = [
            {
                httpMethod: 'POST',
                resourcePath: '/api/identity/login',
                throttlingRateLimit: props.environment === 'staging' ? 5 : 2,
                throttlingBurstLimit: props.environment === 'staging' ? 3 : 1,
            },
            {
                httpMethod: 'GET',
                resourcePath: '/api/statuspages/public/{slug}',
                throttlingRateLimit: props.environment === 'staging' ? 20 : 10,
                throttlingBurstLimit: props.environment === 'staging' ? 10 : 5,
            },
        ];
    }
}