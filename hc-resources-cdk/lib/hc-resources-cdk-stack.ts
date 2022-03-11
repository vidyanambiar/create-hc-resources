import { Stack, CfnParameter, Construct, StackProps, Duration, CfnOutput } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from '@aws-cdk/custom-resources';
import { createHash } from 'crypto';
import { PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export class HcResourcesParamsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    // Lambda function 
    const lambdaFn = lambda.Function.fromFunctionArn(
      this,
      "external-lambda-from-arn",
      "arn:aws:lambda:us-east-1:487455980082:function:HcResourcesCdkStack-HcResourcesLambdamainDD6EE619-pjVcJHrAh3gc");

    // Payload
    const payload: string = JSON.stringify({
      region: region.valueAsString,
      infraID: infraID.valueAsString,
      name: name.valueAsString,
      baseDomain: baseDomain.valueAsString,
      oidcBucketName: oidcBucketName.valueAsString,
      oidcBucketRegion: oidcBucketRegion.valueAsString,
      awsAccessKeyID: awsAccessKeyID.valueAsString,
      awsSecretKey: awsSecretKey.valueAsString,      
    });
    const payloadHashPrefix = createHash('md5').update(payload).digest('hex').substring(0, 6)

    // AWS SDK call to invoke Lambda
    const sdkCall: AwsSdkCall = {
      service: 'Lambda',
      action: 'invoke',
      parameters: {
        FunctionName: lambdaFn.functionName,
        Payload: payload
      },      
      physicalResourceId: PhysicalResourceId.of(`${id}-AwsSdkCall-${payloadHashPrefix}`)
    }

    // create the lambda role - specifying lambda as the service principal and attaching the policy for lambda execution
    const customResourceFnRole = new Role(this, 'AwsCustomResourceRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    })
    customResourceFnRole.addToPolicy(
        new PolicyStatement({
            resources: [`arn:aws:lambda:us-east-1:487455980082:function:HcResourcesCdkStack-HcResourcesLambdamainDD6EE619-pjVcJHrAh3gc`],
            actions: ['lambda:InvokeFunction']
        })
    );

    // Create a custom resource to invoke the lambda
    const customResource = new AwsCustomResource(this, 'AwsCustomResource', {
        policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
        onCreate: sdkCall,
        onUpdate: sdkCall,
        timeout: Duration.minutes(10),
        role: customResourceFnRole
    })

    const response = customResource.getResponseField('Payload');

    // create an Output
    new CfnOutput(this, 'HostedClusterResourcesOutput', {
      value: response,
      description: 'The infra and IAM outputs for the hosted cluster',
    });         
  }
}
