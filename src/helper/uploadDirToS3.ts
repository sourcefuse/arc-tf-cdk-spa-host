import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";
import uniqid from "uniqid";
import * as aws from "@cdktf/provider-aws";
import { Construct } from "constructs";

export function uploadDirectoryToS3(
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
            const objectName = `_${file}-${uniqid()}`;

            new aws.s3Object.S3Object(context, objectName, {
                bucket: bucket.id,
                key: fileKey,
                source: path.resolve(filePath),
                contentType: mime.contentType(path.extname(file)) || undefined,
            });
        }
    }
}
