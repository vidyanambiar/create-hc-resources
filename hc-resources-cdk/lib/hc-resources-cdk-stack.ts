import { Stack, CfnParameter, Construct, StackProps } from '@aws-cdk/core';
import * as hcResourcesLambda from './hc-resources-lambda';

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

    var environment: { [key: string]: string; } = {
      region: region.valueAsString,
      infraID: infraID.valueAsString,
      name: name.valueAsString,
      baseDomain: baseDomain.valueAsString,
      oidcBucketName: oidcBucketName.valueAsString,
      oidcBucketRegion: oidcBucketRegion.valueAsString,
      awsAccessKeyID: awsAccessKeyID.valueAsString,
      infawsSecretKeyraID: awsSecretKey.valueAsString,                                                
    };

    // Build the code and create the lambda
    new hcResourcesLambda.HcResourcesLambda(this, 'HcResourcesLambda', environment);
  }
}
