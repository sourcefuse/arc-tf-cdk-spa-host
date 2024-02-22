import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { CreateAcmCertificate, uploadDirectoryToS3 } from "./helper";
import { BaseConfig } from './baseConfig';

/**
 * This stack sets up various AWS resources to host a static website using CloudFront, S3, ACM, and Route 53.
 * Use this stack to deploy websites that have multiple directories, each with its own index document.
 *
 * @extends {BaseConfig}
 *
 * @example
 * ```ts
 * import {App} from "cdktf";
 *
 * const app = new App();
 * const deployWebsite = new CloudfrontStaticWebsiteStack(app, "static-website");
 * deployWebsite.init();
 * app.synth();
 * ```
 */
export class CloudfrontStaticWebsiteStack extends BaseConfig {
    /**
     * Initializes and deploys the CloudFront static website stack.
     * This method creates and configures AWS resources such as S3 bucket, S3 Objects, CloudFront distribution, ACM certificate, etc.
     */
    init() {
        this
            .createAwsProvider()
            .createS3Bucket()
            .bucketPolicyDocumentConfig = {
            statement: [
                {
                    sid: "AllowCFOrigin",
                    actions: ["s3:GetObject"],
                    resources: [`${this.s3Bucket?.arn ?? ""}/*`],
                    condition: [
                        {
                            test: "StringEquals",
                            variable: "aws:UserAgent",
                            values: [this.refererSecret],
                        },
                    ],
                    principals: [
                        {
                            type: "*",
                            identifiers: ["*"],
                        },
                    ],
                },
            ],
        };

        this
            .createBucketPolicyDocument()
            .createAcmCertificate()
            .createS3BucketOwnershipControls()
            .createS3BucketAcl()
            .createS3BucketPublicAccessBlock()
            .creates3WebsiteConfiguration()
            .cloudfrontDistributionConfig = {
            origin: [
                {
                    domainName: this.s3WebsiteConfiguration?.websiteEndpoint ?? "",
                    originId: `S3-${this.bucketName}`,
                    customOriginConfig: {
                        originProtocolPolicy: "http-only",
                        httpPort: 80,
                        httpsPort: 443,
                        originSslProtocols: ["TLSv1.2"],
                    },
                    customHeader: [
                        {
                            name: "User-Agent",
                            value: this.refererSecret,
                        },
                    ],
                },
            ],
            enabled: true,
            priceClass: "PriceClass_200",
            defaultCacheBehavior: {
                allowedMethods: [
                    "DELETE",
                    "GET",
                    "HEAD",
                    "OPTIONS",
                    "PATCH",
                    "POST",
                    "PUT",
                ],
                cachedMethods: ["GET", "HEAD"],
                targetOriginId: `S3-${this.bucketName}`,
                forwardedValues: {
                    queryString: false,
                    cookies: { forward: "none" },
                },
                viewerProtocolPolicy: "redirect-to-https",
                minTtl: 0,
                defaultTtl: 3600,
                maxTtl: 86400,
                compress: true,
            },
            restrictions: {
                geoRestriction: {
                    restrictionType: "none",
                },
            },
            viewerCertificate: {
                acmCertificateArn: this.acmCertificate?.acmArn ?? "",
                sslSupportMethod: "sni-only",
                minimumProtocolVersion: "TLSv1.2_2019",
            },
            aliases: [this.customDomain],
        };

        this
            .createCloudfrontDistribution()
            .createS3BucketPolicy()
            .createRoute53Record()
            .uploadToS3();
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
     * Creates and configures the S3 bucket ownership controls.
     */
    createS3BucketOwnershipControls() {
        const s3BucketOwnershipControls =
            new aws.s3BucketOwnershipControls.S3BucketOwnershipControls(
                this,
                "s3BucketOwnershipControls",
                this.s3BucketOwnershipControlsConfig
            );
        this.s3BucketOwnershipControls = s3BucketOwnershipControls;
        return this;
    }

    /**
     * Creates and configures the S3 bucket ACL.
     */
    createS3BucketAcl() {
        const s3BucketACl = new aws.s3BucketAcl.S3BucketAcl(
            this,
            "s3BucketAcl",
            this.s3BucketAclConfig
        );
        this.s3BucketACl = s3BucketACl;
        return this;
    }

    /**
     * Creates and configures the S3 bucket public access block settings.
     */
    createS3BucketPublicAccessBlock() {
        const s3BucketPublicAccessBlock =
            new aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlock(
                this,
                "s3PublicAccessConfig",
                this.s3BucketPublicAccessBlockConfig
            );
        this.s3BucketPublicAccessBlock = s3BucketPublicAccessBlock;
        return this;
    }

    /**
     * Creates and configures the S3 bucket website configuration.
     */
    creates3WebsiteConfiguration() {
        const s3WebsiteConfiguration =
            new aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfiguration(
                this,
                "s3BucketWebsiteConfiguration",
                this.s3BucketWebsiteConfigurationConfig
            );
        this.s3WebsiteConfiguration = s3WebsiteConfiguration;
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
     * Constructor for the CloudFront Static Website Stack.
     *
     * @param scope - The AWS CloudFormation stack construct.
     * @param name - The name of the stack.
     */
    constructor(scope: Construct, name: string) {
        super(scope, name);
    }
}
