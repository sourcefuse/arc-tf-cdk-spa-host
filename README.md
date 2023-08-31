# AWS SPA Deployment with CDKTF

Easily deploy your Single-Page Application to Amazon Web Services (AWS) S3 and CloudFront using the Cloud Development Kit for Terraform (CDKTF) with TypeScript. This package streamlines the process by utilizing the Cloud Development Kit (CDK) to define AWS resources.

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

## Usage

The following example demonstrates how to deploy an SPA using this package:

1. [Create a cdk entrypoint file](#create-a-file-for-cdk-entrypoint)
2. [Configure the Environment Variables](#configure-the-environment-variables)
3. [Deploy the infrastructure](#deploy-the-infrastructure)
4. [Verify the deployment](#verify-the-deployment)

### Create a file for CDK entrypoint

To establish the CDK entry point, you'll need to create a TypeScript file named main.ts. Feel free to give it a name that suits your preference, just ensure you replace the name consistently throughout.
Add the following TypeScript code:

```typescript
import { CloudFrontStaticWebsiteStack } from "@arc-iac/tf-cdk-spa";
import { App } from "cdktf";

const app = new App();
new CloudFrontStaticWebsiteStack(app, "spa-host"); // You can change the stack name ("spa-host") as needed.
app.synth();
```

This code initializes an instance of the App class, then creates an instance of your custom CloudFrontStaticWebsiteStack. You can tailor the stack name by changing the second argument of the new CloudFrontStaticWebsiteStack() line ("spa-host" in this example). Lastly, the app.synth() function generates the Terraform configuration based on your CDK code.

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

| Environment Variable         | Default Value | Description                                      |
| ---------------------------- | ------------- | ------------------------------------------------ |
| `AWS_REGION`                 | `us-east-1`   | AWS region for deployment                        |
| `AWS_PROFILE`                | `default`     | AWS profile for authentication and authorization |
| `S3_BUCKET_NAME`             | N/A           | S3 bucket name for storing SPA files             |
| `CUSTOM_DOMAIN`              | N/A           | Custom domain for the SPA                        |
| `HOSTED_ZONE_ID`             | N/A           | Route 53 hosted zone ID for the custom domain    |
| `RELATIVE_PATH_TO_BUILD_DIR` | `../build`    | Relative path to the SPA build directory         |

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
