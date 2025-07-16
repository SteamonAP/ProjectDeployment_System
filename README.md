# 🚀 Project Deployment System

A self-hosted **Vercel-like builder** built with AWS ECS, S3, Redis, and WebSockets.  
This system allows users to **deploy GitHub repos** via an API, build them inside a container, and serve the output dynamically — all from scratch.

---

## 📦 Features

- 🐳 Dockerized ECS Task that clones & builds any public Git repo
- 🔁 Uploads the built static site to S3
- 🔀 Real-time build logs via Redis Pub/Sub + WebSockets
- 🌐 Reverse proxy to serve built sites via subdomain paths
- 💻 CLI-like `/project` POST API to trigger builds

---

## 🧠 Architecture Overview

```txt
  [User] --- POST /project (gitURL) --> [API Server] ---> [AWS ECS]
                                             |
                                             +---> Launches task with ENV vars:
                                                    - GIT_REPO_URL
                                                    - PROJECT_ID
                                                    - REDIS_URI

  [ECS Task]
    - Clones repo
    - Builds it (npm install & npm run build)
    - Publishes build logs via Redis
    - Uploads output to:
        S3://vercel-clone-practiceoutputs/__outputs/<PROJECT_ID>/

  [WebSocket Server]
    - Subscribes to Redis logs
    - Streams logs to frontend via Socket.IO

  [Reverse Proxy (Node.js)]
    - Forwards subdomain requests to S3 public files
📁 Project Structure
bash
Copy
Edit
.
├── api-server/           # Express server to trigger builds & emit logs
│   └── index.js
├── build-server/         # ECS Task logic to clone, build, and upload
│   ├── Dockerfile
│   ├── main.sh           # Entrypoint for ECS task
│   ├── script.js         # Core logic for build + S3 + Redis
│   └── package.json
├── reverse-proxy/        # Optional: Node.js reverse proxy (localhost)
├── .env                  # Secrets & config (not committed)
└── README.md
⚙️ Tech Stack
🐳 Docker + Ubuntu base image

☁️ AWS ECS Fargate (for isolated builds)

💾 AWS S3 (for static site storage)

🔁 Redis (Upstash) for real-time logging

📡 Socket.IO (WebSocket over HTTP)

🧠 Node.js + Express

🔐 Environment Variables
.env (for both API and ECS container)

env
Copy
Edit
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
REDIS_URI=rediss://<upstash-uri>
PROJECT_ID=<generated-slug>
Ensure these are passed to the ECS task using containerOverrides.

🛠️ To Trigger a Build
bash
Copy
Edit
POST /project
Content-Type: application/json

{
  "gitURL": "https://github.com/username/repo",
  "slug": "optional-custom-slug"
}
Returns:

json
Copy
Edit
{
  "status": "queued",
  "data": {
    "projectSlug": "sunny-grapes-blaster",
    "url": "http://sunny-grapes-blaster.localhost:8000"
  }
}
📺 Viewing Logs (Socket.IO)
Connect to: ws://localhost:3000

Emit:

js
Copy
Edit
socket.emit("subscribe", "logs:your-project-slug");
Listen for:

js
Copy
Edit
socket.on("message", (data) => {
  console.log(data); // Real-time logs from build task
});
📤 S3 Output Path
Uploaded files go to:

arduino
Copy
Edit
s3://vercel-clone-practiceoutputs/__outputs/<PROJECT_ID>/*
You can later serve them using a CDN, CloudFront or reverse proxy.

🚧 Current Limitations
Only works with static sites (React/Vite/Vue etc.)

No persistent DB — Redis only stores logs temporarily

Requires AWS credentials + ECR setup

Assumes public GitHub repos

🧠 Inspiration
Built while learning AWS, Redis, Docker, and containerized microservices. Inspired by how Vercel / Netlify abstract deployment with Git triggers and serverless infra.

🙌 Author
Amogh Pitale
github.com/SteamonAP
