const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    ['/api', '/auth', '/api-auth'],
    createProxyMiddleware({
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    })
  );
};
