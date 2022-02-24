import * as cdk from '@aws-cdk/core';
import * as hcResourcesLambda from './hc-resources-lambda';

export class HcResourcesCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Build the code and create the lambda
    new hcResourcesLambda.HcResourcesLambda(this, 'HcResourcesLambda');
  }
}
