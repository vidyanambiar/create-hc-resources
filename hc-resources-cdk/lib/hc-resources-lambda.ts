import * as lambda from '@aws-cdk/aws-lambda-go';
import * as path from 'path';
import { Construct, Stack, Duration, CfnOutput } from '@aws-cdk/core';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from '@aws-cdk/custom-resources';
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { createHash } from 'crypto';
export class HcResourcesLambda extends Construct {
    public readonly response: string
    public readonly customResource: AwsCustomResource
    public readonly function: lambda.GoFunction

    constructor(scope: Construct, id: string, env: { [key: string]: string; }) {
        super(scope, id);

        const stack = Stack.of(this)     
        
        console.log("env: ", env);

        // Build the code and create the lambda
        const lambdaFn = new lambda.GoFunction(this, 'main', {
            entry: path.join(__dirname, '../../hc-resources-lambda'),
            timeout: Duration.seconds(60),
            functionName: "CreateHCResourcesWithParams",            
            environment: env            
        });

        console.log("env.region 👉 ", env.region);

        // Payload
        const payload: string = JSON.stringify({
            region: env.region,
            infraID: env.infraID,
            name: env.name,
            baseDomain: env.baseDomain,
            oidcBucketName: env.oidcBucketName,
            oidcBucketRegion: env.oidcBucketRegion,
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
                resources: [`arn:aws:lambda:${stack.region}:${stack.account}:function:CreateHCResourcesWithParams*`],
                actions: ['lambda:InvokeFunction']
            })
        )        

        this.customResource = new AwsCustomResource(this, 'AwsCustomResource', {
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
            onCreate: sdkCall,
            onUpdate: sdkCall,
            timeout: Duration.minutes(10),
            role: customResourceFnRole
        })

        this.response = this.customResource.getResponseField('Payload')

        this.function = lambdaFn

        // create an Output
        new CfnOutput(this, 'HostedClusterResourcesOutput', {
            value: this.response,
            description: 'The infra and IAM outputs for the hosted cluster',
        });           
    }
}