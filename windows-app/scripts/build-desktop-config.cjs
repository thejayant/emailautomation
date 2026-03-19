const fs = require("node:fs");
const path = require("node:path");
const { loadDesktopConfig } = require("../src/runtime.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const outputRoot = path.join(projectRoot, "windows-app", ".dist");
const outputPath = path.join(outputRoot, "desktop-config.json");

const config = loadDesktopConfig(projectRoot, { packaged: false });

if (!process.env.OUTBOUNDFLOW_APP_ORIGIN && config.appOrigin === "http://127.0.0.1:3000") {
  throw new Error(
    "Set OUTBOUNDFLOW_APP_ORIGIN to your hosted app URL before packaging the safe desktop build.",
  );
}

fs.rmSync(outputRoot, { force: true, recursive: true });
fs.mkdirSync(outputRoot, { recursive: true });

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      OUTBOUNDFLOW_APP_NAME: config.appName,
      OUTBOUNDFLOW_APP_ORIGIN: config.appOrigin,
      OUTBOUNDFLOW_DESKTOP_PROTOCOL: config.protocolScheme,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Desktop config staged in ${outputPath}`);
