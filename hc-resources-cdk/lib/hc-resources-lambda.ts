import * as lambda from '@aws-cdk/aws-lambda-go';
import * as path from 'path';
import * as core from '@aws-cdk/core';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { createHash } from 'crypto'

export class HcResourcesLambda extends core.Construct {
    public readonly response: string
    public readonly customResource: AwsCustomResource
    public readonly function: lambda.GoFunction

    constructor(scope: core.Construct, id: string) {
        super(scope, id);

        // Build the code and create the lambda
        const lambdaFn = new lambda.GoFunction(this, 'main', {
            entry: path.join(__dirname, '../../hc-resources-lambda'),
        });

        const stack = core.Stack.of(this)

        // Payload for Lambda
        const payload: string = JSON.stringify({
            params: {
                config: {
                    region: process.env.REGION,
                    infraID: process.env.INFRA_ID,
                    awsAccessKeyID: process.env.AWS_ACCESS_KEY_ID,
                    awsSecretKey: process.env.AWS_SECRET_KEY,
                    name: process.env.CLUSTER_NAME,
                    baseDomain: process.env.BASE_DOMAIN,
                    oidcBucketName: process.env.OIDC_BUCKET_NAME,
                    oidcBucketRegion: process.env.OIDC_BUCKET_REGION
                }
            }
        })

        const payloadHashPrefix = createHash('md5').update(payload).digest('hex').substring(0, 6)

        const sdkCall: AwsSdkCall = {
            service: 'Lambda',
            action: 'invoke',
            parameters: {
              FunctionName: lambdaFn.functionName,
              Payload: payload
            },
            physicalResourceId: PhysicalResourceId.of(`${id}-AwsSdkCall-${lambdaFn.currentVersion.version + payloadHashPrefix}`)
          }

        // create the lambda role - specifying lambda as the service principal and attaching the policy for lambda execution
        const customResourceFnRole = new Role(this, 'AwsCustomResourceRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
          })
        customResourceFnRole.addToPolicy(
            new PolicyStatement({
                resources: [`arn:aws:lambda:${stack.region}:${stack.account}:function:*-ResInit${stack.stackName}`],
                actions: ['lambda:InvokeFunction']
            })
        )        

        this.customResource = new AwsCustomResource(this, 'AwsCustomResource', {
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
            onUpdate: sdkCall,
            timeout: core.Duration.minutes(10),
            role: customResourceFnRole
        })

        this.response = this.customResource.getResponseField('Payload')

        this.function = lambdaFn
    }
}