package main

import (
	"context"
	"fmt"
	"os"

	cmd "github.com/openshift/hypershift/cmd/infra/aws"
	log "github.com/sirupsen/logrus"

	"github.com/aws/aws-lambda-go/lambda"
)

type CreateResourcesEvent struct {
	Name               string	`json:"name"`				// A name for the hosted cluster
}

// The response is made up of outputs from the AWS infra and IAM hypershift commands
type ResourcesResponse struct {
	InfraOutput *cmd.CreateInfraOutput	`json:"infraOutput"`
	IAMOutput *cmd.CreateIAMOutput		`json:"iamOutput"`
}

var createInfraOutput *cmd.CreateInfraOutput

// Create AWS infra resources for a hosted cluster
func createInfraResources(createResourcesEvent CreateResourcesEvent) (*cmd.CreateInfraOutput, error) {
	log.Info("***** Create AWS infrastructure resources for a cluster")

	createInfraOpts := cmd.CreateInfraOptions{
		Region: 			os.Getenv("region"),		
		Name:   			createResourcesEvent.Name,
		InfraID:			os.Getenv("infraID"),
		AWSKey:				os.Getenv("awsAccessKeyID"),
		AWSSecretKey:		os.Getenv("awsSecretKey"),
		AWSCredentialsFile:	"",
		BaseDomain:			os.Getenv("baseDomain"),
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
		return nil, err
	} else {
		log.WithFields(log.Fields{"result": createInfraOutput}).Info("Infra Output JSON")
		return createInfraOutput, nil
	}
}

// Create AWS IAM resources for a hosted cluster
func createIAMResources(createResourcesEvent CreateResourcesEvent) (*cmd.CreateIAMOutput, error) {
	log.Info("***** Create AWS IAM resources")

	createIAMOpts := cmd.CreateIAMOptions{
		Region: 							os.Getenv("region"),
		OIDCStorageProviderS3BucketName:	os.Getenv("oidcBucketName"),
		OIDCStorageProviderS3Region: 		os.Getenv("oidcBucketRegion"),
		InfraID:							os.Getenv("infraID"),
		AWSCredentialsFile:					"",
		AWSKey:								os.Getenv("awsAccessKeyID"),
		AWSSecretKey:						os.Getenv("awsSecretKey"),
		PublicZoneID:						createInfraOutput.PublicZoneID,		// The id of the cluster's public route53 zone
		PrivateZoneID:						createInfraOutput.PrivateZoneID,	// The id of the cluster's private route53 zone
		LocalZoneID: 						createInfraOutput.LocalZoneID,		// The id of the cluster's local route53 zone
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
		return nil, err
	} else {
		log.WithFields(log.Fields{"result": result}).Info("IAM Output JSON")
		return result, nil
	}	
}

// Lambda event handler
func HandleRequest(ctx context.Context, createResourcesEvent CreateResourcesEvent) (ResourcesResponse, error) {
	// Validate event attributes
	if _, ok := os.LookupEnv("awsAccessKeyID"); !ok {
		return ResourcesResponse{}, fmt.Errorf("missing AWS access key")
	}
	
	if _, ok := os.LookupEnv("awsSecretKey"); !ok {
		return ResourcesResponse{}, fmt.Errorf("missing AWS secret Key")
	}
	
	if _, ok := os.LookupEnv("infraID"); !ok  {
		return ResourcesResponse{}, fmt.Errorf("missing infraID")
	}

	if _, ok := os.LookupEnv("baseDomain"); !ok {
		return ResourcesResponse{}, fmt.Errorf("missing baseDomain")
	}

	if _, ok := os.LookupEnv("oidcBucketName"); !ok {
		return ResourcesResponse{}, fmt.Errorf("missing oidcBucketName")
	}

	if _, ok := os.LookupEnv("oidcBucketRegion"); !ok {
		return ResourcesResponse{}, fmt.Errorf("missing oidcBucketRegion")
	}

	if (createResourcesEvent.Name == "") {
		return ResourcesResponse{}, fmt.Errorf("missing cluster name")
	}		
	
	// Note: infra must be created first as values from the infra output will be used for creating IAM resources
	createInfraOutput, err := createInfraResources(createResourcesEvent)

	outputResponse := ResourcesResponse{}

	if err != nil {
		return outputResponse, err
	} else {
		outputResponse.InfraOutput = createInfraOutput
	}

	createIAMOutput, err := createIAMResources(createResourcesEvent)

	if err != nil {
		return outputResponse, err
	} else {
		outputResponse.IAMOutput = createIAMOutput
	}
	
	return outputResponse, nil
}

func main() {
	// Execute the Lambda function
	lambda.Start(HandleRequest)
}