/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";
import { config } from "dotenv";
import uniqid from "uniqid";
import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";
import { TerraformStack, Token } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { CreateAcmCertificate, IAcmCertificate } from "./helper/utils";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";

config();

export class CloudfrontSPAWebsiteStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    const bucketName = process.env.S3_BUCKET_NAME || "";
    const customDomain = process.env.CUSTOM_DOMAIN || "";
    const hostedZoneId = process.env.HOSTED_ZONE_ID || "";
    const relativePathToBuildDir =
      process.env.RELATIVE_PATH_TO_BUILD_DIR || "../build";

    new AwsProvider(this, "aws", {
      region: process.env.AWS_REGION || "us-east-1",
      profile: process.env.AWS_PROFILE || "default",
    });

    const spaBucket = new aws.s3Bucket.S3Bucket(this, "spaBucket", {
      bucket: bucketName,
      tags: {
        Terraform: "true",
        Environment: "dev",
      },
    });

    const acmCertificate = new CreateAcmCertificate(this, "acmCertificate", {
      domainName: customDomain,
      hostedZoneId,
    });

    const oac =
      new aws.cloudfrontOriginAccessControl.CloudfrontOriginAccessControl(
        this,
        "oac",
        {
          name: `${bucketName}-OAC`,
          description: "Allow CloudFront access to the bucket",
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
        }
      );

    const cloudfrontDistribution =
      new aws.cloudfrontDistribution.CloudfrontDistribution(
        this,
        "websiteDistribution",
        {
          origin: [
            {
              domainName: spaBucket.bucketRegionalDomainName,
              originId: `S3-${bucketName}`,
              originAccessControlId: oac.id,
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
            targetOriginId: `S3-${bucketName}`,
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
            acmCertificateArn: acmCertificate.acmArn,
            sslSupportMethod: "sni-only",
            minimumProtocolVersion: "TLSv1.2_2019",
          },
          aliases: [customDomain],
        }
      );

    new aws.s3BucketPolicy.S3BucketPolicy(this, "spaBucketPolicy", {
      bucket: spaBucket.id,
      policy: `{
        "Version": "2008-10-17",
        "Id": "PolicyForCloudFrontPrivateContent",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipal",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "${spaBucket.arn}/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "${cloudfrontDistribution.arn}"
                    }
                }
            }
        ]
    }`,
    });

    new aws.route53Record.Route53Record(this, "route53Record", {
      name: customDomain,
      zoneId: hostedZoneId,
      type: "A",
      alias: {
        name: cloudfrontDistribution.domainName,
        zoneId: cloudfrontDistribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    });

    uploadDirectoryToS3(relativePathToBuildDir, spaBucket, "", this);
  }
}

function uploadDirectoryToS3(
  sourcePath: string,
  bucket: aws.s3Bucket.S3Bucket,
  prefix: string,
  context: Construct
) {
  const files = fs.readdirSync(sourcePath);

  for (const file of files) {
    const filePath = path.join(sourcePath, file);
    const fileKey = path.join(prefix, file);

    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory()) {
      uploadDirectoryToS3(filePath, bucket, fileKey, context);
    } else {
      const objectName = `${file}-${uniqid()}`;

      new aws.s3Object.S3Object(context, objectName, {
        bucket: bucket.id,
        key: fileKey,
        source: path.resolve(filePath),
        contentType: mime.contentType(path.extname(file)) || undefined,
      });
    }
  }
}

/**
 * Configuration class for creating a CloudFront static website stack.
 * @extends TerraformStack
 */
class CloudfrontStaticWebsiteStackConfig extends TerraformStack {
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

  /**
   * Getters
   */

  /**
   * Get the AWS provider configuration.
   */
  get awsConfig() {
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
    this._bucketPolicyDocumentConfig = {
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
    return this._bucketPolicyDocumentConfig;
  }

  /**
   * Get the S3 bucket ownership controls configuration.
   */
  get s3BucketOwnershipControlsConfig() {
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
    this._cloudfrontDistributionConfig = {
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
    return this._cloudfrontDistributionConfig;
  }

  /**
   * Get the S3 bucket policy configuration.
   */
  get s3BucketPolicyConfig() {
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
   * Setters
   */

  /**
   * Set the AWS provider configuration.
   * @param {aws.provider.AwsProviderConfig} config
   */
  set awsConfig(config: aws.provider.AwsProviderConfig) {
    this._awsConfig = config;
  }

  /**
   * Set the S3 bucket configuration.
   * @param {aws.s3Bucket.S3BucketConfig} config
   */
  set s3BucketConfig(config: aws.s3Bucket.S3BucketConfig) {
    this._s3BucketConfig = config;
  }

  /**
   * Set the bucket policy document configuration.
   * @param {aws.dataAwsIamPolicyDocument.DataAwsIamPolicyDocumentConfig} config
   */
  set bucketPolicyDocumentConfig(
    config: aws.dataAwsIamPolicyDocument.DataAwsIamPolicyDocumentConfig
  ) {
    this._bucketPolicyDocumentConfig = config;
  }

  /**
   * Set the ACM certificate configuration.
   * @param {IAcmCertificate} config
   */
  set acmCertificateConfig(config: IAcmCertificate) {
    this._acmCertificateConfig = config;
  }

  /**
   * Set the S3 bucket ownership controls configuration.
   * @param {aws.s3BucketOwnershipControls.S3BucketOwnershipControlsConfig} config
   */
  set s3BucketOwnershipControlsConfig(
    config: aws.s3BucketOwnershipControls.S3BucketOwnershipControlsConfig
  ) {
    this._s3BucketOwnershipControlsConfig = config;
  }

  /**
   * Set the S3 bucket ACL configuration.
   * @param {aws.s3BucketAcl.S3BucketAclConfig} config
   */
  set s3BucketAclConfig(config: aws.s3BucketAcl.S3BucketAclConfig) {
    this._s3BucketAclConfig = config;
  }

  /**
   * Set the S3 bucket public access block configuration.
   * @param {aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlockConfig} config
   */
  set s3BucketPublicAccessBlockConfig(
    config: aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlockConfig
  ) {
    this._s3BucketPublicAccessBlockConfig = config;
  }

  /**
   * Set the S3 bucket website configuration.
   * @param {aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfigurationConfig} config
   */
  set s3BucketWebsiteConfigurationConfig(
    config: aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfigurationConfig
  ) {
    this._s3BucketWebsiteConfigurationConfig = config;
  }

  /**
   * Set the CloudFront distribution configuration.
   * @param {aws.cloudfrontDistribution.CloudfrontDistributionConfig} config
   */
  set cloudfrontDistributionConfig(
    config: aws.cloudfrontDistribution.CloudfrontDistributionConfig
  ) {
    this._cloudfrontDistributionConfig = config;
  }

  /**
   * Set the S3 bucket policy configuration.
   * @param {aws.s3BucketPolicy.S3BucketPolicyConfig} config
   */
  set s3BucketPolicyConfig(config: aws.s3BucketPolicy.S3BucketPolicyConfig) {
    this._s3BucketPolicyConfig = config;
  }

  /**
   * Set the Route 53 record configuration.
   * @param {aws.route53Record.Route53RecordConfig} config
   */
  set route53RecordConfig(config: aws.route53Record.Route53RecordConfig) {
    this._route53RecordConfig = config;
  }
}

/**
 * This stack sets up various AWS resources to host a static website using CloudFront, S3, ACM, and Route 53.
 * Use this stack to deploy websites that have multiple directories, each with its own index document.
 *
 * @extends {CloudfrontStaticWebsiteStackConfig}
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
export class CloudfrontStaticWebsiteStack extends CloudfrontStaticWebsiteStackConfig {
  /**
   * Initializes and deploys the CloudFront static website stack.
   * This method creates and configures AWS resources such as S3 bucket, S3 Objects, CloudFront distribution, ACM certificate, etc.
   */
  init() {
    this.createAwsProvider();
    this.createS3Bucket();
    this.createBucketPolicyDocument();
    this.createAcmCertificate();
    this.createS3BucketOwnershipControls();
    this.createS3BucketAcl();
    this.createS3BucketPublicAccessBlock();
    this.creates3WebsiteConfiguration();
    this.createCloudfrontDistribution();
    this.createS3BucketPolicy();
    this.createRoute53Record();
    uploadDirectoryToS3(this.relativePathToBuildDir, this.s3Bucket!, "", this);
  }

  /**
   * Creates and configures the AWS provider.
   *
   * @returns {AwsProvider} The AWS provider instance.
   */
  createAwsProvider(): AwsProvider {
    const awsProvider = new AwsProvider(this, "aws", this.awsConfig);
    this.awsProvider = awsProvider;
    return awsProvider;
  }

  /**
   * Creates and configures the S3 bucket.
   *
   * @returns {aws.s3Bucket.S3Bucket} The S3 bucket instance.
   */
  createS3Bucket(): aws.s3Bucket.S3Bucket {
    const s3Bucket = new aws.s3Bucket.S3Bucket(
      this,
      "s3Bucket",
      this.s3BucketConfig
    );
    this.s3Bucket = s3Bucket;
    return s3Bucket;
  }

  /**
   * Creates and configures the IAM policy document for the S3 bucket.
   *
   * @returns {DataAwsIamPolicyDocument} The IAM policy document instance.
   */
  createBucketPolicyDocument(): DataAwsIamPolicyDocument {
    const bucketPolicyDocument = new DataAwsIamPolicyDocument(
      this,
      "bucketPolicyDocument",
      this.bucketPolicyDocumentConfig
    );
    this.bucketPolicyDocument = bucketPolicyDocument;
    return bucketPolicyDocument;
  }

  /**
   * Creates and configures the ACM certificate for the custom domain.
   *
   * @returns {CreateAcmCertificate} The ACM certificate instance.
   */
  createAcmCertificate(): CreateAcmCertificate {
    const acmCertificate = new CreateAcmCertificate(
      this,
      "acmCertificate",
      this.acmCertificateConfig
    );
    this.acmCertificate = acmCertificate;
    return acmCertificate;
  }

  /**
   * Creates and configures the S3 bucket ownership controls.
   *
   * @returns {aws.s3BucketOwnershipControls.S3BucketOwnershipControls} The S3 bucket ownership controls instance.
   */
  createS3BucketOwnershipControls(): aws.s3BucketOwnershipControls.S3BucketOwnershipControls {
    const s3BucketOwnershipControls =
      new aws.s3BucketOwnershipControls.S3BucketOwnershipControls(
        this,
        "s3BucketOwnershipControls",
        this.s3BucketOwnershipControlsConfig
      );
    this.s3BucketOwnershipControls = s3BucketOwnershipControls;
    return s3BucketOwnershipControls;
  }

  /**
   * Creates and configures the S3 bucket ACL.
   *
   * @returns {aws.s3BucketAcl.S3BucketAcl} The S3 bucket ACL instance.
   */
  createS3BucketAcl(): aws.s3BucketAcl.S3BucketAcl {
    const s3BucketACl = new aws.s3BucketAcl.S3BucketAcl(
      this,
      "s3BucketAcl",
      this.s3BucketAclConfig
    );
    this.s3BucketACl = s3BucketACl;
    return s3BucketACl;
  }

  /**
   * Creates and configures the S3 bucket public access block settings.
   *
   * @returns {aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlock} The S3 bucket public access block instance.
   */
  createS3BucketPublicAccessBlock(): aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlock {
    const s3BucketPublicAccessBlock =
      new aws.s3BucketPublicAccessBlock.S3BucketPublicAccessBlock(
        this,
        "s3PublicAccessConfig",
        this.s3BucketPublicAccessBlockConfig
      );
    this.s3BucketPublicAccessBlock = s3BucketPublicAccessBlock;
    return s3BucketPublicAccessBlock;
  }

  /**
   * Creates and configures the S3 bucket website configuration.
   *
   * @returns {aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfiguration} The S3 bucket website configuration instance.
   */
  creates3WebsiteConfiguration(): aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfiguration {
    const s3WebsiteConfiguration =
      new aws.s3BucketWebsiteConfiguration.S3BucketWebsiteConfiguration(
        this,
        "s3BucketWebsiteConfiguration",
        this.s3BucketWebsiteConfigurationConfig
      );
    this.s3WebsiteConfiguration = s3WebsiteConfiguration;
    return s3WebsiteConfiguration;
  }

  /**
   * Creates and configures the CloudFront distribution.
   *
   * @returns {aws.cloudfrontDistribution.CloudfrontDistribution} The CloudFront distribution instance.
   */
  createCloudfrontDistribution(): aws.cloudfrontDistribution.CloudfrontDistribution {
    const cloudfrontDistribution =
      new aws.cloudfrontDistribution.CloudfrontDistribution(
        this,
        "websiteDistribution",
        this.cloudfrontDistributionConfig
      );
    this.cloudfrontDistribution = cloudfrontDistribution;
    return cloudfrontDistribution;
  }

  /**
   * Creates and configures the S3 bucket policy.
   *
   * @returns {aws.s3BucketPolicy.S3BucketPolicy} The S3 bucket policy instance.
   */
  createS3BucketPolicy(): aws.s3BucketPolicy.S3BucketPolicy {
    const s3BucketPolicy = new aws.s3BucketPolicy.S3BucketPolicy(
      this,
      "staticWebsiteBucketPolicy",
      this.s3BucketPolicyConfig
    );
    this.s3BucketPolicy = s3BucketPolicy;
    return s3BucketPolicy;
  }

  /**
   * Creates and configures the Route 53 DNS record for the custom domain.
   *
   * @returns {aws.route53Record.Route53Record} The Route 53 DNS record instance.
   */
  createRoute53Record(): aws.route53Record.Route53Record {
    const route53Record = new aws.route53Record.Route53Record(
      this,
      "route53Record",
      this.route53RecordConfig
    );
    this.route53Record = route53Record;
    return route53Record;
  }

  /**
   * Constructor for the CloudFront Static Website Stack.
   *
   * @param {Construct} scope - The AWS CloudFormation stack construct.
   * @param {string} name - The name of the stack.
   */
  constructor(scope: Construct, name: string) {
    super(scope, name);
  }
}
