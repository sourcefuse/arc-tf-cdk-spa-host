import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { CreateAcmCertificate, uploadDirectoryToS3 } from "./helper";
import { BaseConfig } from './baseConfig';

/**
 * This stack sets up various AWS resources to host a single page applicatio using CloudFront, S3, ACM, and Route 53.
 *
 * @extends {BaseConfig}
 *
 * @example
 * ```ts
 * import {App} from "cdktf";
 *
 * const app = new App();
 * const deployWebsite = new CloudfrontSPAWebsiteStack(app, "my-react-app");
 * deployWebsite.init();
 * app.synth();
 * ```
 */
export class CloudfrontSPAWebsiteStack extends BaseConfig {
    /**
     * Initializes and deploys the CloudFront static website stack.
     * This method creates and configures AWS resources such as S3 bucket, S3 Objects, CloudFront distribution, ACM certificate, etc.
     */
    init() {
        this
            .createAwsProvider()
            .createS3Bucket()
            .createAcmCertificate()
            .createOriginAccessControl()
            .createCloudfrontDistribution()
            .createBucketPolicyDocument()
            .createS3BucketPolicy()
            .createRoute53Record()
            .uploadToS3()
    }

    uploadToS3() {
        uploadDirectoryToS3(this.relativePathToBuildDir, this.s3Bucket!, "", this);
    }

    /**
     * Creates and configures the AWS provider.
     */
    createAwsProvider() {
        const awsProvider = new AwsProvider(this, "aws", this.awsConfig);
        this.awsProvider = awsProvider;
        return this;
    }

    /**
     * Creates and configures the S3 bucket.
     */
    createS3Bucket() {
        const s3Bucket = new aws.s3Bucket.S3Bucket(
            this,
            "s3Bucket",
            this.s3BucketConfig
        );
        this.s3Bucket = s3Bucket;
        return this;
    }

    /**
     * Creates and configures the IAM policy document for the S3 bucket.
     */
    createBucketPolicyDocument() {
        const bucketPolicyDocument = new DataAwsIamPolicyDocument(
            this,
            "bucketPolicyDocument",
            this.bucketPolicyDocumentConfig
        );
        this.bucketPolicyDocument = bucketPolicyDocument;
        return this;
    }

    /**
     * Creates and configures the ACM certificate for the custom domain.
     */
    createAcmCertificate() {
        const acmCertificate = new CreateAcmCertificate(
            this,
            "acmCertificate",
            this.acmCertificateConfig
        );
        this.acmCertificate = acmCertificate;
        return this;
    }

    /**
     * Creates and configures the CloudFront distribution.
     */
    createCloudfrontDistribution() {
        const cloudfrontDistribution =
            new aws.cloudfrontDistribution.CloudfrontDistribution(
                this,
                "websiteDistribution",
                this.cloudfrontDistributionConfig
            );
        this.cloudfrontDistribution = cloudfrontDistribution;
        return this;
    }

    /**
     * Creates and configures the S3 bucket policy.
     */
    createS3BucketPolicy() {
        const s3BucketPolicy = new aws.s3BucketPolicy.S3BucketPolicy(
            this,
            "staticWebsiteBucketPolicy",
            this.s3BucketPolicyConfig
        );
        this.s3BucketPolicy = s3BucketPolicy;
        return this;
    }

    /**
     * Creates and configures the Route 53 DNS record for the custom domain.
     */
    createRoute53Record() {
        const route53Record = new aws.route53Record.Route53Record(
            this,
            "route53Record",
            this.route53RecordConfig
        );
        this.route53Record = route53Record;
        return this;
    }

    /**
     * Creates and configures the Origin Access Control for the clodfront distribution
     */
    createOriginAccessControl() {
        this.originAccessControl = new aws.cloudfrontOriginAccessControl.CloudfrontOriginAccessControl(
            this,
            "originAccessControl",
            this.originAccessControlConfig,
        );
        return this;
    }

    /**
     * Constructor for the CloudFront Static Website Stack.
     * @param scope - The AWS CloudFormation stack construct.
     * @param name - The name of the stack.
     */
    constructor(scope: Construct, name: string) {
        super(scope, name);
    }
}
