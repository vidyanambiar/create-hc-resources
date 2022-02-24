import * as lambda from '@aws-cdk/aws-lambda-go';
import * as path from 'path';
import * as core from '@aws-cdk/core';

export class HcResourcesLambda extends core.Construct {
    constructor(scope: core.Construct, id: string) {
        super(scope, id);

        // Build the code and create the lambda
        new lambda.GoFunction(this, 'main', {
            entry: path.join(__dirname, '../../hc-resources-lambda'),
        });        
    }
}