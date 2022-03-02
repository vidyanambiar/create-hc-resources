import * as lambda from '@aws-cdk/aws-lambda-go';
import * as path from 'path';
import * as core from '@aws-cdk/core';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from '@aws-cdk/custom-resources'
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { createHash } from 'crypto'
import { CfnParameter } from '@aws-cdk/core';

export class HcResourcesLambda extends core.Construct {
    public readonly response: string
    public readonly customResource: AwsCustomResource
    public readonly function: lambda.GoFunction

    constructor(scope: core.Construct, id: string) {
        super(scope, id);

        const stack = core.Stack.of(this)

        // Parameters for the lambda function
        const region = new CfnParameter(this, "region", {
            type: "String",
            description: "The region where cluster infra should be created"});
        const infraID = new CfnParameter(this, "infraID", {
            type: "String",
            description: "Infrastructure ID to use for AWS resources"}); 
        const awsAccessKeyID = new CfnParameter(this, "awsAccessKeyID", {
            type: "String",
            description: "AWS Access Key ID for account to create resources in"});
        const awsSecretKey = new CfnParameter(this, "awsSecretKey", {
            type: "String",
            description: "AWS Secret Key for account to create resources in"});
        const name = new CfnParameter(this, "name", {
            type: "String",
            description: "A name for the hosted cluster"}); 
        const baseDomain = new CfnParameter(this, "baseDomain", {
            type: "String",
            description: "The ingress base domain for the cluster"});
        const oidcBucketName = new CfnParameter(this, "oidcBucketName", {
            type: "String",
            description: "The name of the bucket in which the OIDC discovery document is stored"}); 
        const oidcBucketRegion = new CfnParameter(this, "oidcBucketRegion", {
            type: "String",
            description: "The region of the bucket in which the OIDC discovery document is stored"});             

        // Build the code and create the lambda
        const lambdaFn = new lambda.GoFunction(this, 'main', {
            entry: path.join(__dirname, '../../hc-resources-lambda'),
            environment: {
                region: region.valueAsString,
                infraID: infraID.valueAsString,
                name: name.valueAsString,
                baseDomain: baseDomain.valueAsString,
                oidcBucketName: oidcBucketName.valueAsString,
                oidcBucketRegion: oidcBucketRegion.valueAsString,
                awsAccessKeyID: awsAccessKeyID.valueAsString,
                infawsSecretKeyraID: awsSecretKey.valueAsString,                                                
              },            
        });

        // Payload
        const payload: string = JSON.stringify({
            region: region.valueAsString,
            infraID: infraID.valueAsString,
            name: name.valueAsString,
            baseDomain: baseDomain.valueAsString,
            oidcBucketName: oidcBucketName.valueAsString,
            oidcBucketRegion: oidcBucketRegion.valueAsString,
        })

        const payloadHashPrefix = createHash('md5').update(payload).digest('hex').substring(0, 6)

        const sdkCall: AwsSdkCall = {
            service: 'Lambda',
            action: 'invoke',
            parameters: {
              FunctionName: lambdaFn.functionName,
            },
            physicalResourceId: PhysicalResourceId.of(`${id}-AwsSdkCall-${lambdaFn.currentVersion.version + payloadHashPrefix}`)
          }

        // create the lambda role - specifying lambda as the service principal and attaching the policy for lambda execution
        const customResourceFnRole = new Role(this, 'AwsCustomResourceRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
          })
        customResourceFnRole.addToPolicy(
            new PolicyStatement({
                resources: [`arn:aws:lambda:${stack.region}:${stack.account}:function:*${stack.stackName}*`],
                actions: ['lambda:InvokeFunction']
            })
        )        

        this.customResource = new AwsCustomResource(this, 'AwsCustomResource', {
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
            onCreate: sdkCall,
            onUpdate: sdkCall,
            timeout: core.Duration.minutes(10),
            role: customResourceFnRole
        })

        this.response = this.customResource.getResponseField('Payload')

        this.function = lambdaFn
    }
}