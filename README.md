# Create resources in AWS for a hosted cluster in Hypershift

This repo deploys a stack that creates/updates a custom resource that triggers a Go-based AWS Lambda function using AWS CDK. The Lambda function creates the infra and IAM resources in AWS that are required for creating a hosted cluster in hypershift. 
The stack's output JSON contains the ARNs that can be used to create a hosted cluster using the `hypershift create cluster` command.

The documentation here describes the resources that get created for infra and IAM: 
https://hypershift-docs.netlify.app/how-to/create-infra-iam-separately/

#### Lambda
Implemented as a GO Lambda function - The code is located in the `/hc-resources-lambda` folder. This function internally calls functions from hypershift's `github.com/openshift/hypershift/cmd/infra/aws` package to create the Infra and IAM resources in AWS.

#### CDK deployment
The code for the CDK stack to deploy the custom resource and lambda is located in the `/hc-resources-cdk` folder

Specify parameters during deployment of the stack:

```bash
cdk deploy \
  --parameters region=<Region where cluster infra should be created> \
  --parameters infraID=<Infrastructure ID to use for AWS resources> \
  --parameters name=<A name for the hosted cluster> \
  --parameters baseDomain=<The ingress base domain for the cluster> \
  --parameters oidcBucketName=<The name of the bucket in which the OIDC discovery document is stored> \
  --parameters oidcBucketRegion=<The region of the bucket in which the OIDC discovery document is stored> \
  --parameters awsAccessKeyID=<AWS Access Key ID for account to create resources in> \
  --parameters awsSecretKey=<AWS Secret Key for account to create resources in>
```

#### Output:
```
{
  "infraOutput": {
      // Infra output ARNs from hypershift's create infra aws
  },
  "iamOutput": {
      // IAM output ARNs from hypershift's create iam aws
  }
}
```

#### Useful commands
*Run from within the `/hc-resources-cdk` folder*

`cdk synth` causes the resources defined in the app (lambda function in this case) to be translated into an AWS CloudFormation template
`cdk bootstrap` bootstrap cdk components into your AWS account/region
`cdk deploy` deploys this stack to your default AWS account/region