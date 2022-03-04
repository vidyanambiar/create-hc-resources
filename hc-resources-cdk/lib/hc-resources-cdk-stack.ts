import { Stack, Construct, StackProps} from '@aws-cdk/core';
import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import * as path from 'path';
import * as lambda from '@aws-cdk/aws-lambda-go';

export class HcResourcesAPI extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Build the code and create the lambda
    const lambdaFunction = new lambda.GoFunction(this, 'main', {
        entry: path.join(__dirname, '../../hc-resources-lambda'),
    });

    // Create Rest API Gateway in front of the lambda
    const apiGtw = this.createApiGatewayForLambda("backend-api-endpoint", lambdaFunction, 'Exposed endpoint for your GO lambda API')    
  }

  /**
   * createApiGatewayForLambda is creating a Rest API Gateway to access to your lambda function
   * @param id - CDK id for this lambda
   * @param handler - Lambda function to call
   * @param description - Description of this endpoint
   */
  createApiGatewayForLambda(id: string, handler: lambda.GoFunction, description: string): LambdaRestApi{
    return new LambdaRestApi(this, id, {
      handler,
      description
    });
  }
}
