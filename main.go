package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"

	cmd "github.com/openshift/hypershift/cmd/infra/aws"
	log "github.com/sirupsen/logrus"
)

var createInfraOutput *cmd.CreateInfraOutput

// Create AWS infra resources for a hosted cluster
func createInfraResources() {
	// Get values for infra options from environment variables
	region := os.Getenv("REGION")
	clusterName := os.Getenv("CLUSTER_NAME")
	infraID := os.Getenv("INFRA_ID")
	awsCreds := os.Getenv("AWS_CREDS")
	baseDomain := os.Getenv("BASE_DOMAIN")

	log.Info("***** Create AWS infrastructure resources for a cluster")

	createInfraOpts := cmd.CreateInfraOptions{
		Region: 			region,		
		Name:   			clusterName,	// A name for the cluster
		InfraID:			infraID,		// ID with which to tag resources
		AWSCredentialsFile: awsCreds,		// Path to file containing AWS credentials
		BaseDomain:			baseDomain,
	}

	log.WithFields(log.Fields{
		"Region":         	createInfraOpts.Region,
		"Name":             createInfraOpts.Name,
		"InfraID":          createInfraOpts.InfraID,
		"BaseDomain":      	createInfraOpts.BaseDomain,
	}).Info("Configuration Values for Infra:")	

	var err error
	
	createInfraOutput, err = createInfraOpts.CreateInfra(context.TODO())

	if err != nil {
		log.WithFields(log.Fields{"error": err}).Fatal("Error creating infra!")
	} else {
		log.WithFields(log.Fields{"result": createInfraOutput}).Info("Infra Output JSON")

		file, _ := json.MarshalIndent(createInfraOutput, "", " ")
	 
		_ = ioutil.WriteFile(fmt.Sprintf("%v-output.json", infraID), file, 0644)
	}
}

// Create AWS IAM resources for a hosted cluster
func createIAMResources() {
	// Get values for IAM options from environment variables
	region := os.Getenv("REGION")
	oidcBucketName := os.Getenv("OIDC_BUCKET_NAME")
	oidcBucketRegion := os.Getenv("OIDC_BUCKET_REGION")
	infraID := os.Getenv("INFRA_ID")
	awsCreds := os.Getenv("AWS_CREDS")
	publicZoneID := createInfraOutput.PublicZoneID
	privateZoneID := createInfraOutput.PrivateZoneID
	localZoneID := createInfraOutput.LocalZoneID

	log.Info("***** Create AWS IAM resources")

	createIAMOpts := cmd.CreateIAMOptions{
		Region: 							region,				// Region where cluster infra should be created
		OIDCStorageProviderS3BucketName:	oidcBucketName,		// The name of the bucket in which the OIDC discovery document is stored
		OIDCStorageProviderS3Region: 		oidcBucketRegion,	// The region of the bucket in which the OIDC discovery document is stored
		InfraID:							infraID,			// Infrastructure ID to use for AWS resources. It is used to identify the IAM resources associated with the hosted cluster.
		AWSCredentialsFile: 				awsCreds,			// Path to file containing AWS credentials
		PublicZoneID:						publicZoneID,		// The id of the cluster's public route53 zone
		PrivateZoneID:						privateZoneID,		// The id of the cluster's private route53 zone
		LocalZoneID: 						localZoneID,		// The id of the cluster's local route53 zone
	}

	log.WithFields(log.Fields{
		"Region":         						createIAMOpts.Region,
		"InfraID":								createIAMOpts.InfraID,
		"OIDCStorageProviderS3BucketName":      createIAMOpts.OIDCStorageProviderS3BucketName,
		"OIDCStorageProviderS3Region":          createIAMOpts.OIDCStorageProviderS3Region,																	
		"PublicZoneID":      					createIAMOpts.PublicZoneID,
		"PrivateZoneID":						createIAMOpts.PrivateZoneID,
		"LocalZoneID":							createIAMOpts.LocalZoneID,
	}).Info("Configuration Values for IAM:")

	result, err := createIAMOpts.CreateIAM(context.TODO(), nil)

	if err != nil {
		log.WithFields(log.Fields{"error": err}).Fatal("Error creating IAM!")
	} else {
		log.WithFields(log.Fields{"result": result}).Info("IAM Output JSON")

		file, _ := json.MarshalIndent(result, "", " ")
	 
		_ = ioutil.WriteFile(fmt.Sprintf("%v-iam-output.json", infraID), file, 0644)
	}	
}

func main() {
	// Note: infra must be created first as values from the infra output will be used for creating IAM resources
	createInfraResources()

	createIAMResources()
}