const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const dotenv = require("dotenv");
dotenv.config();

const Redis = require("ioredis");

const publisher = new Redis(process.env.REDIS_URL,{
  maxRetriesPerRequest: null,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

if (!PROJECT_ID || !process.env.REDIS_URI) {
  console.error("Missing required env vars: PROJECT_ID or REDIS_URI");
  process.exit(1);
}


const publishLog = (log) => {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
};

const init = async () => {
  console.log("Executing script.js");
  publishLog("Build started...");
  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
    publishLog(data.toString());
  });
  p.stderr.on("error", function (data) {
    console.log("Error", data.toString());
    publishLog(`Error: ${data.toString()}`);
  });

  p.on("close", async function () {
    console.log("Build Complete...");
    publishLog(`Build Complete...`);
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });
    publishLog(`Stating to upload...`);
    for (const filePath of distFolderContents) {
      const fullFilePath = path.join(distFolderPath, filePath);
      if (fs.lstatSync(fullFilePath).isDirectory()) continue;

      console.log("uploading", filePath);
      publishLog(`uploading ${filePath}`);

      const command = new PutObjectCommand({
        Bucket: "vercel-clone-practiceoutputs",
        Key: `__outputs/${PROJECT_ID}/${filePath}`,
        Body: fs.createReadStream(fullFilePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      });
      
      try {
        await s3Client.send(command);
        publishLog(`uploaded ${filePath}`);
      } catch (error) {
        publishLog(` Failed to upload ${filePath}: ${error.message}`);
      }
    }
    publishLog(`Done`);
    console.log("Done..!");
  });
};

init();
