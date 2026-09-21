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
            {
                httpMethod: 'ANY',
                proxy: true,
                options: {
                    requestParameters: {
                        'integration.request.path.proxy': 'method.request.path.proxy',
                    },
                },
            }
        );

        api.root.addProxy({
            defaultIntegration: integration,
            anyMethod: true,
            defaultMethodOptions: {
                requestParameters: {
                    'method.request.path.proxy': true,
                },
            },
        });

        const apiResource = api.root.addResource('api');

        const identity = apiResource.addResource('identity');
        const login = identity.addResource('login');

        const loginIntegration = new apigateway.HttpIntegration(
            `http://${props.albDnsName}/api/identity/login`,
            { httpMethod: 'POST', proxy: true }
        );
        login.addMethod('POST', loginIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        const statuspages = apiResource.addResource('statuspages');
        const publicPages = statuspages.addResource('public');
        const slug = publicPages.addResource('{slug}');

        const slugIntegration = new apigateway.HttpIntegration(
            `http://${props.albDnsName}/api/statuspages/public/{slug}`,
            {
                httpMethod: 'GET',
                proxy: true,
                options: {
                    requestParameters: {
                        'integration.request.path.slug': 'method.request.path.slug',
                    },
                },
            }
        );
        slug.addMethod('GET', slugIntegration, {
            requestParameters: {
                'method.request.path.slug': true,
            },
            methodResponses: [{ statusCode: '200' }],
        });

        const cfnStage = api.deploymentStage.node.defaultChild as apigateway.CfnStage;
        cfnStage.methodSettings = [
            {
                httpMethod: 'POST',
                resourcePath: '/api/identity/login',
                throttlingRateLimit: props.environment === 'staging' ? 5 : 10,
                throttlingBurstLimit: props.environment === 'staging' ? 3 : 20,
            },
            {
                httpMethod: 'GET',
                resourcePath: '/api/statuspages/public/{slug}',
                throttlingRateLimit: props.environment === 'staging' ? 20 : 50,
                throttlingBurstLimit: props.environment === 'staging' ? 10 : 100,
            },
        ];
    }
}