import { App } from "cdktf"
import { CloudfrontSPAWebsiteStack } from './cloudfrontSPAWebsiteStack';
import { CloudfrontStaticWebsiteStack } from './cloudfrontStaticWebsiteStack';

const app = new App();
// This creates a stack to deploy single page app with a modified priceClass of PriceClass_100 different from the default PriceClass_200
const myReactAppStack = new CloudfrontSPAWebsiteStack(app, "test-stack");

myReactAppStack
    .createAwsProvider()
    .createS3Bucket()
    .createAcmCertificate()
    .createOriginAccessControl()
    .cloudfrontDistributionConfig = {
    ...myReactAppStack.cloudfrontDistributionConfig,
    priceClass: "PriceClass_100",
};

myReactAppStack
    .createCloudfrontDistribution()
    .createBucketPolicyDocument()
    .createS3BucketPolicy()
    .createRoute53Record()
    .uploadToS3()

// This creates a stack to deploy a multi index document (like a docs site)
const webStack = new CloudfrontStaticWebsiteStack(app, "arc-docs");
webStack.bucketName = "arc-docs-build";
webStack.relativePathToBuildDir = "../arc-docs";
webStack.init();

app.synth();
