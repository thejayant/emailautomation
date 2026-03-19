const path = require("node:path");
const { spawn } = require("node:child_process");

const electronBinary = require("electron");
const projectRoot = path.resolve(__dirname, "..", "..");
const isDevelopment = process.argv.includes("--dev");

const child = spawn(electronBinary, [path.join(projectRoot, "windows-app", "src", "main.cjs")], {
  cwd: projectRoot,
  env: {
    ...process.env,
    OUTBOUNDFLOW_DESKTOP_MODE: isDevelopment ? "development" : "production",
  },
  stdio: "inherit",
});

child.once("exit", (code) => {
  process.exit(code ?? 0);
});
