const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require('dotenv');
dotenv.config();

const BASE_PATH = process.env.BASE_PATH;
const app = express();

const PORT = 8000;

const dynamicProxy = (req, res, next) => {
  const hostname = req.hostname || req.headers.host;

  let subdomain = "test";
  if (hostname && hostname.includes(".")) {
    subdomain = hostname.split(".")[0];
  }

  if (req.query.projectId) {
    subdomain = req.query.projectId;
  }

  if(req.url === "/"){
    req.url = "/index.html"
  }

  const target = `${BASE_PATH}/${subdomain}`;
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\//, ""),
    logger: console,
  });
  return proxy(req, res, next);
};

app.use(dynamicProxy);

app.listen(PORT, () => console.log(`Reverse Proxy Running on PORT ${PORT}`));
