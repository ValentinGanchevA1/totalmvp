const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: 'C:\\Users\\vganc\\Documents\\Claude\\Projects\\totalmvp\\backend\\.env' });

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

console.log('Testing bucket:', bucket, 'region:', region);

const client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

client.send(new HeadBucketCommand({ Bucket: bucket }))
  .then(() => console.log('SUCCESS: bucket exists and is accessible'))
  .catch((e) => {
    const status = e['$metadata'] && e['$metadata'].httpStatusCode;
    console.error('HTTP Status:', status);
    console.error('Error name:', e.name);
    console.error('Error message:', e.message);
    if (status === 301) console.log('=> Bucket is in a DIFFERENT region than', region);
    if (status === 403) console.log('=> Bucket EXISTS but IAM user has no permission');
    if (status === 404) console.log('=> Bucket does NOT exist — create it in S3 console');
  });
