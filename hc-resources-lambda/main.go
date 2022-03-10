package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	cmd "github.com/openshift/hypershift/cmd/infra/aws"
	log "github.com/sirupsen/logrus"

	cfn "github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
)

// The response is made up of outputs from the AWS infra and IAM hypershift commands
type ResourcesResponse struct {
	InfraOutput *cmd.CreateInfraOutput	`json:"infraOutput"`
	IAMOutput *cmd.CreateIAMOutput		`json:"iamOutput"`
}

var createInfraOutput *cmd.CreateInfraOutput

// Create AWS infra resources for a hosted cluster
func createInfraResources() (*cmd.CreateInfraOutput, error) {
	log.Info("***** Create AWS infrastructure resources for a cluster")

	createInfraOpts := cmd.CreateInfraOptions{
		Region: 			os.Getenv("region"),		
		Name:   			os.Getenv("name"),
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
func createIAMResources() (*cmd.CreateIAMOutput, error) {
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
func HandleRequest (ctx context.Context, event cfn.Event) {

	id := uuid.New()

	r := cfn.NewResponse(&cfn.Event{
		RequestID:         event.RequestID,
		ResponseURL:       event.ResponseURL,
		LogicalResourceID: event.LogicalResourceID,
		StackID:           event.StackID,
	})

	r.PhysicalResourceID = "MyCustomResource_" + id.String()

	if (event.RequestType != "Create") {
		r.Status = cfn.StatusFailed
		r.Reason = fmt.Sprintf("Resources are not created on a %v event", event.RequestType)
	}

	// Validate event attributes
	if _, ok := os.LookupEnv("awsAccessKeyID"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing AWS access key ID"
		r.Send()
	}
	
	if _, ok := os.LookupEnv("awsSecretKey"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing AWS secret Key"
		r.Send()
	}
	
	if _, ok := os.LookupEnv("infraID"); !ok  {
		r.Status = cfn.StatusFailed
		r.Reason = "missing infraID"
		r.Send()
	}

	if _, ok := os.LookupEnv("baseDomain"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing baseDomain"
		r.Send()
	}

	if _, ok := os.LookupEnv("oidcBucketName"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing oidcBucketName"
		r.Send()
	}

	if _, ok := os.LookupEnv("oidcBucketRegion"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing oidcBucketRegion"
		r.Send()
	}

	if _, ok := os.LookupEnv("name"); !ok {
		r.Status = cfn.StatusFailed
		r.Reason = "missing cluster name"
		r.Send()
	}		
	
	// Note: infra must be created first as values from the infra output will be used for creating IAM resources
	createInfraOutput, err := createInfraResources()

	outputResponse := ResourcesResponse{}

	data, _ := json.Marshal(outputResponse)
	finalOutput := map[string]interface{}{ "Payload": string(data) }

	if err != nil {
		r.Status = cfn.StatusFailed
		r.Reason = "error creating infra resources"
		r.Data = finalOutput
		r.Send()
	} else {
		outputResponse.InfraOutput = createInfraOutput
	}

	data, _ = json.Marshal(outputResponse)
	finalOutput = map[string]interface{}{ "Payload": string(data) }
	r.Data = finalOutput

	createIAMOutput, err := createIAMResources()

	if err != nil {
		r.Status = cfn.StatusFailed
		r.Reason = "error creating iam resources"
		r.Data = finalOutput
		r.Send()
	} else {
		outputResponse.IAMOutput = createIAMOutput
	}

	data, _ = json.Marshal(outputResponse)
	finalOutput = map[string]interface{}{ "Payload": string(data) }
	r.Data = finalOutput

	r.Status = cfn.StatusSuccess


	log.WithFields(log.Fields(r.Data)).Info("Response values:")	

	r.Send()
	
	// return outputResponse, nil
}

func main() {
	// Execute the Lambda function
	lambda.Start(HandleRequest)
}