require("dotenv").config();
const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const cors = require("cors");
const http = require("http");

const app = express();
const PORT = 9000;
const SOCKET_PORT = 3000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const subscriber = new Redis("rediss://default:AeQYAAIjcDExYzhmMjg1OTg2MmU0MzI1OTAyMjk1MjgxM2VlNDgzZnAxMA@outgoing-hare-58392.upstash.io:6379",{
  maxRetriesPerRequest: null,
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// io.listen(SOCKET_PORT, () =>
//   console.log(` Socket.IO server running at http://localhost:${SOCKET_PORT}`)
// );

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:ap-south-1:339713028012:cluster/builder-cluster1",
  TASK: "arn:aws:ecs:ap-south-1:339713028012:task-definition/builder-task:9",
};

app.post("/project", async (req, res) => {
  const { gitURL, slug } = req.body;
  const projectSlug = slug ? slug : generateSlug();

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-03b5d207e1883090b",
          "subnet-0442a5a344e04515f",
          "subnet-021f8a1e614714902",
        ],
        securityGroups: ["sg-0b732b4c579a48973"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            {
              name: "GIT_REPO_URL",
              value: gitURL,
            },
            {
              name: "PROJECT_ID",
              value: projectSlug,
            },
            {
              name: "REDIS_URI",
              value: "rediss://default:AeQYAAIjcDExYzhmMjg1OTg2MmU0MzI1OTAyMjk1MjgxM2VlNDgzZnAxMA@outgoing-hare-58392.upstash.io:6379",
            },
          ],
        },
      ],
    },
  });
  await ecsClient.send(command);
  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

const initRedisSubscribe = async () => {
  try {
    await subscriber.psubscribe("logs:*");
    subscriber.on("pmessage", (pattern, channel, message) => {
      io.to(channel).emit("message", message);
    });
    console.log(" Subscribed to Redis log channels");
  } catch (error) {
    console.error(" Redis subscription error:", err.message);
  }
};

initRedisSubscribe();

server.listen(PORT, () => {
  console.log(` API + WebSocket Server running on http://localhost:${PORT}`);
})
