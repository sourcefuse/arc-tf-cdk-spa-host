import { config } from "dotenv";
import * as aws from "@cdktf/provider-aws";
import { TerraformStack, Token } from "cdktf";
import { CreateAcmCertificate, IAcmCertificate } from "./helper/utils";

config();

/**
 * Configuration class for creating a CloudFront static website stack.
 * @extends TerraformStack
 */
export class BaseConfig extends TerraformStack {
    /**
     * The S3 bucket name for the static website.
     */
    bucketName: string = process.env.S3_BUCKET_NAME || "";

    /**
     * The custom domain for the static website.
     */
    customDomain: string = process.env.CUSTOM_DOMAIN || "";

    /**
     * The hosted zone ID for Route 53.
     */
    hostedZoneId: string = process.env.HOSTED_ZONE_ID || "";

    /**
     * The relative path to the build directory.
     */
    relativePathToBuildDir: string =
        process.env.RELATIVE_PATH_TO_BUILD_DIR || "../build";

    /**
     * The referer secret for the bucket policy.
     */
    refererSecret: string = process.env.REFERER_SECRET ?? "";

    /**
     * The AWS provider resource.
     */
    awsProvider: aws.provider.AwsProvider | null = null;

    /**
     * The aws_s3_bucket resource.
     */
    s3Bucket: aws.s3Bucket.S3Bucket | null = null;

    /**
     * The  aws_iam_policy_document data source.
     */
    bucketPolicyDocument: aws.dataAwsIamPolicyDocument.DataAwsIamPolicyDocument | null =
        null;

    /**
     * The ACM certificate resource.
     */
    acmCertificate: CreateAcmCertificate | null = null;

    /**
     * The aws_s3_bucket_ownership_controls resource.
     */
    s3BucketOwnershipControls: aws.s3BucketOwnershipControls.S3BucketOwnershipControls | null =
        null;

    /**
     * The aws_s3_bucket_acl resource.
     */
    s3BucketACl: aws.s3BucketAcl.S3BucketAcl | null = null;

    /**
     * The aws_s3_bucket_public_access_block resource.
     */
    s3BucketPublicAccessBlock: aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlock | null =
        null;

    /**
     * The aws_s3_bucket_website_configuration resource.
     */
    s3WebsiteConfiguration: aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfiguration | null =
        null;

    /**
     * The aws_cloudfront_distribution resource
     */
    cloudfrontDistribution: aws.cloudfrontDistribution.CloudfrontDistribution | null =
        null;

    /**
     * The aws_s3_bucket_policy resource.
     */
    s3BucketPolicy: aws.s3BucketPolicy.S3BucketPolicy | null = null;

    /**
     * The aws_route53_record resource.
     */
    route53Record: aws.route53Record.Route53Record | null = null;

    /**
    * The aws_cloudfront_origin_access_control resource
    */
    originAccessControl: aws.cloudfrontOriginAccessControl.CloudfrontOriginAccessControl | null = null;

    private _awsConfig: aws.provider.AwsProviderConfig | null = null;
    private _s3BucketConfig: aws.s3Bucket.S3BucketConfig | null = null;
    private _bucketPolicyDocumentConfig: aws.dataAwsIamPolicyDocument.DataAwsIamPolicyDocumentConfig | null =
        null;
    private _acmCertificateConfig: IAcmCertificate | null = null;
    private _s3BucketOwnershipControlsConfig: aws.s3BucketOwnershipControls.S3BucketOwnershipControlsConfig | null =
        null;
    private _s3BucketAclConfig: aws.s3BucketAcl.S3BucketAclConfig | null = null;
    private _s3BucketPublicAccessBlockConfig: aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlockConfig | null =
        null;
    private _s3BucketWebsiteConfigurationConfig: aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfigurationConfig | null =
        null;
    private _cloudfrontDistributionConfig: aws.cloudfrontDistribution.CloudfrontDistributionConfig | null =
        null;
    private _s3BucketPolicyConfig: aws.s3BucketPolicy.S3BucketPolicyConfig | null =
        null;
    private _route53RecordConfig: aws.route53Record.Route53RecordConfig | null =
        null;
    private _originAccessControlConfig: aws.cloudfrontOriginAccessControl.CloudfrontOriginAccessControlConfig | null = null;

    /**
     * Getters
     */

    /**
     * Get the AWS provider configuration.
     */
    get awsConfig() {
        if (!this._awsConfig)   // default value
            this._awsConfig = {
                region: process.env.AWS_REGION || "us-east-1",
                profile: process.env.AWS_PROFILE || "default",
            };
        return this._awsConfig;
    }

    /**
     * Get the S3 bucket configuration.
     */
    get s3BucketConfig() {
        if (!this._s3BucketConfig)  // default value
            this._s3BucketConfig = {
                bucket: this.bucketName,
                tags: {
                    Terraform: "true",
                    Environment: "dev",
                },
            };
        return this._s3BucketConfig;
    }

    /**
     * Get the ACM certificate configuration.
     */
    get acmCertificateConfig() {
        if (!this._acmCertificateConfig)  // default value
            this._acmCertificateConfig = {
                domainName: this.customDomain,
                hostedZoneId: this.hostedZoneId,
            };
        return this._acmCertificateConfig;
    }

    /**
     * Get the bucket policy document configuration.
     */
    get bucketPolicyDocumentConfig() {
        if (!this._bucketPolicyDocumentConfig)  // default value
            this._bucketPolicyDocumentConfig = {
                version: "2008-10-17",
                statement: [
                    {
                        sid: "AllowCloudfrontServicePrincipal",
                        effect: "Allow",
                        principals: [
                            {
                                identifiers: ["cloudfront.amazonaws.com"],
                                type: "Service",
                            }
                        ],
                        actions: ['s3:GetObject'],
                        resources: [`${this.s3Bucket?.arn}/*`],
                        condition: [
                            {
                                test: "StringEquals",
                                variable: "aws:SourceArn",
                                values: [this.cloudfrontDistribution?.arn ?? ""]
                            }
                        ]
                    }
                ]
            }
        return this._bucketPolicyDocumentConfig;
    }

    /**
     * Get the S3 bucket ownership controls configuration.
     */
    get s3BucketOwnershipControlsConfig() {
        if (!this._s3BucketOwnershipControlsConfig)  // default value
            this._s3BucketOwnershipControlsConfig = {
                bucket: this.s3Bucket?.id ?? "",
                rule: {
                    objectOwnership: "BucketOwnerPreferred",
                },
            };
        return this._s3BucketOwnershipControlsConfig;
    }

    /**
     * Get the S3 bucket ACL configuration.
     */
    get s3BucketAclConfig() {
        if (!this._s3BucketAclConfig)  // default value
            this._s3BucketAclConfig = {
                bucket: this.s3Bucket?.id ?? "",
                acl: "private",
                dependsOn: [this.s3BucketOwnershipControls!],
            };
        return this._s3BucketAclConfig;
    }

    /**
     * Get the S3 bucket public access block configuration.
     */
    get s3BucketPublicAccessBlockConfig() {
        if (!this._s3BucketPublicAccessBlockConfig)  // default value
            this._s3BucketPublicAccessBlockConfig = {
                blockPublicPolicy: false,
                bucket: this.s3Bucket?.id ?? "",
                restrictPublicBuckets: false,
            };
        return this._s3BucketPublicAccessBlockConfig;
    }

    /**
     * Get the S3 bucket website configuration.
     */
    get s3BucketWebsiteConfigurationConfig() {
        if (!this._s3BucketWebsiteConfigurationConfig)  // default value
            this._s3BucketWebsiteConfigurationConfig = {
                bucket: this.s3Bucket?.id ?? "",
                indexDocument: {
                    suffix: "index.html",
                },
            };
        return this._s3BucketWebsiteConfigurationConfig;
    }

    /**
     * Get the CloudFront distribution configuration.
     */
    get cloudfrontDistributionConfig() {
        if (!this._cloudfrontDistributionConfig)  // default value
            this._cloudfrontDistributionConfig = {
                origin: [
                    {
                        domainName: this.s3Bucket!.bucketRegionalDomainName ?? "",
                        originId: `S3-${this.bucketName}`,
                        originAccessControlId: this.originAccessControl!.id,
                    },
                ],
                enabled: true,
                defaultRootObject: "index.html",
                priceClass: "PriceClass_200",
                customErrorResponse: [
                    {
                        errorCode: 404,
                        responseCode: 200,
                        responsePagePath: "/index.html",
                    },
                    {
                        errorCode: 403,
                        responseCode: 200,
                        responsePagePath: "/index.html",
                    },
                ],
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
                        queryString: true,
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
                    acmCertificateArn: this.acmCertificate!.acmArn,
                    sslSupportMethod: "sni-only",
                    minimumProtocolVersion: "TLSv1.2_2019",
                },
                aliases: [this.customDomain],
            };
        return this._cloudfrontDistributionConfig;
    }

    /**
     * Get the S3 bucket policy configuration.
     */
    get s3BucketPolicyConfig() {
        if (!this._s3BucketPolicyConfig)  // default value
            this._s3BucketPolicyConfig = {
                bucket: this.s3Bucket?.id ?? "",
                policy: Token.asString(this.bucketPolicyDocument?.json ?? ""),
            };
        return this._s3BucketPolicyConfig;
    }

    /**
     * Get the Route 53 record configuration.
     */
    get route53RecordConfig() {
        if (!this._route53RecordConfig)  // default value
            this._route53RecordConfig = {
                name: this.customDomain,
                zoneId: this.hostedZoneId,
                type: "A",
                alias: {
                    name: this.cloudfrontDistribution?.domainName ?? "",
                    zoneId: this.cloudfrontDistribution?.hostedZoneId ?? "",
                    evaluateTargetHealth: false,
                },
            };
        return this._route53RecordConfig;
    }

    /**
     * Cloudfront Origin Access Control Config
     */
    get originAccessControlConfig() {
        if (!this._originAccessControlConfig)  // default value
            this._originAccessControlConfig = {
                name: `${this.bucketName}-OAC`,
                description: "Allow Cloudfront access to the bucket",
                originAccessControlOriginType: "s3",
                signingBehavior: "always",
                signingProtocol: "sigv4",
            }
        return this._originAccessControlConfig;
    }

    /**
     * Setters
     */

    /**
     * Set the AWS provider configuration.
     * @param config
     */
    set awsConfig(config: aws.provider.AwsProviderConfig) {
        this._awsConfig = config;
    }

    /**
     * Set the S3 bucket configuration.
     * @param config
     */
    set s3BucketConfig(config: aws.s3Bucket.S3BucketConfig) {
        this._s3BucketConfig = config;
    }

    /**
     * Set the bucket policy document configuration.
     * @param config
     */
    set bucketPolicyDocumentConfig(
        config: aws.dataAwsIamPolicyDocument.DataAwsIamPolicyDocumentConfig
    ) {
        this._bucketPolicyDocumentConfig = config;
    }

    /**
     * Set the ACM certificate configuration.
     * @param config
     */
    set acmCertificateConfig(config: IAcmCertificate) {
        this._acmCertificateConfig = config;
    }

    /**
     * Set the S3 bucket ownership controls configuration.
     * @param config
     */
    set s3BucketOwnershipControlsConfig(
        config: aws.s3BucketOwnershipControls.S3BucketOwnershipControlsConfig
    ) {
        this._s3BucketOwnershipControlsConfig = config;
    }

    /**
     * Set the S3 bucket ACL configuration.
     * @param config
     */
    set s3BucketAclConfig(config: aws.s3BucketAcl.S3BucketAclConfig) {
        this._s3BucketAclConfig = config;
    }

    /**
     * Set the S3 bucket public access block configuration.
     * @param config
     */
    set s3BucketPublicAccessBlockConfig(
        config: aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlockConfig
    ) {
        this._s3BucketPublicAccessBlockConfig = config;
    }

    /**
     * Set the S3 bucket website configuration.
     * @param config
     */
    set s3BucketWebsiteConfigurationConfig(
        config: aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfigurationConfig
    ) {
        this._s3BucketWebsiteConfigurationConfig = config;
    }

    /**
     * Set the CloudFront distribution configuration.
     * @param config
     */
    set cloudfrontDistributionConfig(
        config: aws.cloudfrontDistribution.CloudfrontDistributionConfig
    ) {
        this._cloudfrontDistributionConfig = config;
    }

    /**
     * Set the S3 bucket policy configuration.
     * @param config
     */
    set s3BucketPolicyConfig(config: aws.s3BucketPolicy.S3BucketPolicyConfig) {
        this._s3BucketPolicyConfig = config;
    }

    /**
     * Set the Route 53 record configuration.
     * @param config
     */
    set route53RecordConfig(config: aws.route53Record.Route53RecordConfig) {
        this._route53RecordConfig = config;
    }

    /**
     * Set the Origin Access Control configuration
     * @param config 
     */
    set originAccessControlConfig(config: aws.cloudfrontOriginAccessControl.CloudfrontOriginAccessControlConfig) {
        this._originAccessControlConfig = config;
    }
}
