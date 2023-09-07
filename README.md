# AWS Static and Single-Page Application (SPA) Deployment with CDKTF

Simplify the deployment of your static websites and Single-Page Applications (SPAs) to Amazon Web Services (AWS) S3 and CloudFront using the Cloud Development Kit for Terraform (CDKTF) with TypeScript. This package leverages the power of the Cloud Development Kit (CDK) to define and manage AWS resources effortlessly.

With support for both traditional static websites and modern SPAs, including flexible routing options, our toolkit makes it easier than ever to host and deploy your web applications on AWS infrastructure. Take advantage of AWS S3 and CloudFront's performance, scalability, and reliability while streamlining your deployment workflow.

## Prerequisites

Before you begin, ensure you have the following prerequisites in place:

- **AWS Account:** You'll need an AWS account to deploy infrastructure and access necessary services.
- **Node.js and npm:** Install Node.js and npm (Node Package Manager) on your local development machine.
- **Terraform:** Install the Terraform CLI on your local development machine.
- **AWS CLI:** Install the AWS CLI and configure it with your AWS credentials.
- **Hosted Zone in Route 53:** Set up a hosted zone in AWS Route 53 for your custom domain.

## Installation

```bash
npm install @arc-iac/tf-cdk-spa
```

## Migrating from v1 -> v2

The class name `CloudFrontStaticWebsiteStack` has been updated to `CloudfrontSPAWebsiteStack`. The `CloudFrontSPAWebsiteStack` is now more suitable for deploying websites with a single index document, which is often the case for Single Page Applications (SPAs) built using technologies like React.

If you need to deploy a static website that has multiple index documents, you can use the `CloudfrontStaticWebsiteStack` class. More details on usage can be found in the [exports section](#exports).

## Exports

This package exports the following classes:

1. [CloudFrontSPAWebsiteStack](#cloudfrontspawebsitestack)
2. [CloudfrontStaticWebsiteStack](#cloudfrontstaticwebsitestack)

### CloudFrontSPAWebsiteStack

The `CloudFrontSPAWebsiteStack` class allows you to easily set up and deploy Single Page Applications (SPAs) with a single index document using AWS CloudFront, S3, OAC, ACM, and Route 53. This stack simplifies the deployment process and ensures your SPA is highly available and globally accessible.

#### Usage example

```typescript
import { CloudFrontSPAWebsiteStack } from "@arc-iac/tf-cdk-spa";
import { App } from "cdktf";

const app = new App();
new CloudFrontSPAWebsiteStack(app, "spa-host");
app.synth();
```

### CloudfrontStaticWebsiteStack

The `CloudfrontStaticWebsiteStack` class provides a flexible and robust solution for hosting static websites on AWS using CloudFront, S3, ACM, and Route 53. This stack is ideal for deploying websites with multiple directories, each having its own index document.

#### Usage Example

```typescript
import { CloudfrontStaticWebsiteStack } from "@arc-iac/tf-cdk-spa";

// Create an instance of the CloudfrontStaticWebsiteStack
const staticWebsiteStack = new CloudfrontStaticWebsiteStack(
  app,
  "MyStaticWebsiteStack"
);

// Customize the stack's configuration as needed
// You can choose to skip this step and use the default configuration.
staticWebsiteStack.awsConfig = {
  region: "us-west-2",
  profile: "my-aws-profile",
};

staticWebsiteStack.s3BucketConfig = {
  bucket: "my-static-website-bucket",
  tags: {
    Terraform: "true",
    Environment: "prod",
  },
};

// Initialize and deploy the stack
staticWebsiteStack.init();
```

## Usage

The following example demonstrates how to deploy a site (using the default configurations used in this package).

1. [Choose a suitable Class](#choose-a-suitable-class)
2. [Create a cdk entrypoint file](#create-a-file-for-cdk-entrypoint)
3. [Create a cdktf.json file](#create-a-cdktfjson-file)
4. [Configure the Environment Variables](#configure-the-environment-variables)
5. [Deploy the infrastructure](#deploy-the-infrastructure)
6. [Verify the deployment](#verify-the-deployment)

### Choose a suitable class

Select a suitable class for your use case. More on classes in [exports section](#exports).
In this example I have used `CloudfrontStaticWebsiteStack` but you may choose as per your need.

### Create a file for CDK entrypoint

To establish the CDK entry point, you'll need to create a TypeScript file named main.ts. Feel free to give it a name that suits your preference, just ensure you replace the name consistently throughout.
Add the following TypeScript code:

```typescript
import { CloudFrontSPAWebsiteStack } from "@arc-iac/tf-cdk-spa";
import { App } from "cdktf";

const app = new App();
new CloudFrontSPAWebsiteStack(app, "spa-host"); // You can change the stack name ("spa-host") as needed.
app.synth();
```

This code initializes an instance of the App class, then creates an instance of your custom `CloudFrontSPAWebsiteStack`. You can tailor the stack name by changing the second argument of the new `CloudFrontSPAWebsiteStack()` line ("spa-host" in this example). Lastly, the app.synth() function generates the Terraform configuration based on your CDK code.

### Create a cdktf.json file

A cdktf project requires a cdktf.json file. Using the cdktf.json file you can supply custom configuration settings for your application.
You can use the following content in your cdktf.json

```json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "projectId": "a-random-uuid"
}
```

You can learn more about cdktf.json [here](https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/configuration-file).

### Configure the [Environment Variables](#environment-variables)

The example below shows a configuration of env variables.

```environment
AWS_REGION=us-east-1
S3_BUCKET_NAME=my-custom-s3-bucket
CUSTOM_DOMAIN=my-custom-domain-name.com
HOSTED_ZONE_ID=Z00000000
RELATIVE_PATH_TO_BUILD_DIR=../build
```

### Deploy the Infrastructure

```bash
npx cdktf deploy spa-host
```

This command leverages Terraform and CDK to create AWS resources based on the code in `main.ts`. The deployment might take a few minutes.

**Note:** If you have multiple stacks or custom stack names, use `cdktf deploy <stack-name>`.

### Verify the Deployment

After successful deployment, access your SPA through the custom domain specified in `CUSTOM_DOMAIN`. Keep in mind that CloudFront might take some time to fully activate. If you encounter an `AccessDenied` error, it's likely due to ongoing CloudFront provisioning. Wait about 15-20 minutes before accessing your resources.

## Environment Variables

The deployment process relies on several environment variables. Create a `.env` file in the project's root directory and set the following variables:

| Environment Variable         | Default Value | Description                                                                                                                                 |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `AWS_REGION`                 | `us-east-1`   | AWS region for deployment                                                                                                                   |
| `AWS_PROFILE`                | `default`     | AWS profile for authentication and authorization                                                                                            |
| `S3_BUCKET_NAME`             | N/A           | S3 bucket name for storing SPA files                                                                                                        |
| `CUSTOM_DOMAIN`              | N/A           | Custom domain for the SPA                                                                                                                   |
| `HOSTED_ZONE_ID`             | N/A           | Route 53 hosted zone ID for the custom domain                                                                                               |
| `RELATIVE_PATH_TO_BUILD_DIR` | `../build`    | Relative path to the SPA build directory                                                                                                    |
| `REFERER_SECRET`             | N/A           | A secret key used in the HTTP headers to control access to your s3 bucket objects (Required only for `CloudfrontStaticWebsiteStack` class). |

If any variables are not provided, the default values mentioned above will be used.

## Cleanup

To remove deployed resources from AWS, run:

```bash
npx cdktf destroy spa-host
```

Use this command to destroy infrastructure created during deployment. Confirm the destruction when prompted. Replace `spa-host` with your stack names if customized.

## License

This code is licensed under the MPL-2.0 license.

## References

- [Terraform](https://www.terraform.io/)
- [CDK for Terraform](https://developer.hashicorp.com/terraform/cdktf)
- [CDKTF AWS Provider](https://github.com/cdktf/cdktf-provider-aws)
- [AWS CLI](https://aws.amazon.com/cli/)
