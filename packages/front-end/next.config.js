const fs = require("fs");
const path = require("path");

const rootPath = path.join(__dirname, "..", "..");

let gitSha = "";
let gitCommitDate = "";
if (fs.existsSync(path.join(rootPath, "buildinfo", "SHA"))) {
  gitSha = fs.readFileSync(path.join(rootPath, "buildinfo", "SHA")).toString();
}
if (fs.existsSync(path.join(rootPath, "buildinfo", "DATE"))) {
  gitCommitDate = fs
    .readFileSync(path.join(rootPath, "buildinfo", "DATE"))
    .toString();
}

const cspHeader = `
    frame-ancestors 'none';
`;

module.exports = {
  // We already run eslint and typescript in CI/CD
  // Disable here to speed up production builds
  assetPrefix: process.env.IS_CLOUD
    ? `https://growthbook-cloud-static-files.s3.amazonaws.com/${gitCommitDate}/${gitSha}/`
    : "",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspHeader.replace(/\n/g, ""),
        },
        {
          key: "X-Frame-Options",
          value: "deny",
        },
      ],
    },
  ],
};
