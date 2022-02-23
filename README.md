# Create resources in AWS for a hosted cluster in Hypershift

This code can be used to create the infra and IAM resources in AWS that are required for creating a hosted cluster in hypershift. The output JSONs contain the ARNs that can be used to create a hosted cluster using the `hypershift create cluster` command.

The documentation here describes the resources that get created for infra and IAM: 
https://hypershift-docs.netlify.app/how-to/create-infra-iam-separately/

##### Environment variables to set before running the code:

```bash
# Region where cluster infra should be created
export REGION=...
# A name for the hosted cluster
export CLUSTER_NAME=...
# Infrastructure ID to use for AWS resources.
export INFRA_ID=...
# Path to an AWS credentials file
export AWS_CREDS=...
# The ingress base domain for the cluster
export BASE_DOMAIN=...
# The name of the bucket in which the OIDC discovery document is stored
export OIDC_BUCKET_NAME=...
# The region of the bucket in which the OIDC discovery document is stored
export OIDC_BUCKET_REGION=...
```

```
// build
go build

// run go binary
create-hc-resources
```