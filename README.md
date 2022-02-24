# Create resources in AWS for a hosted cluster in Hypershift

This repo deploys a Go-based AWS Lambda function using AWS CDK. The Lambda function creates the infra and IAM resources in AWS that are required for creating a hosted cluster in hypershift. 
The output JSON contains the ARNs that can be used to create a hosted cluster using the `hypershift create cluster` command.

The documentation here describes the resources that get created for infra and IAM: 
https://hypershift-docs.netlify.app/how-to/create-infra-iam-separately/

#### Lambda
Implemented as a GO Lambda function - The code is located in the `/hc-resources-lambda` folder. This function internally calls functions from hypershift's `github.com/openshift/hypershift/cmd/infra/aws` package to create the Infra and IAM resources in AWS.

#### CDK deployment
The code for the CDK stack to deploy the lambda is located in the `/hc-resources-cdk` folder
#### Inputs for the Lambda event:

```bash
{
  "region": "value",            // Region where cluster infra should be created
  "infraID": "value",           // Infrastructure ID to use for AWS resources
  "awsAccessKeyID": "value",    // AWS Access Key ID for account to create resources in
  "awsSecretKey": "value",      // AWS Secret Key for account to create resources in
  "name": "value",              // A name for the hosted cluster
  "baseDomain": "value",        // The ingress base domain for the cluster
  "oidcBucketName": "value",    // The name of the bucket in which the OIDC discovery document is stored
  "oidcBucketRegion": "value",  // The region of the bucket in which the OIDC discovery document is stored
}
```

#### Useful commands
*Run from within the `/hc-resources-cdk` folder*

`cdk synth` causes the resources defined in the app (lambda function in this case) to be translated into an AWS CloudFormation template
`cdk bootstrap` bootstrap cdk components into your AWS account/region
`cdk deploy` deploys this stack to your default AWS account/region