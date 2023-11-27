const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  const backend = createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: { "^/backend": "/static" },
  });
  app.use("/api", backend);
  app.use("/backend", backend);
};
