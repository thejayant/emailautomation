const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadDesktopRuntimeEnv, serializeEnv } = require("../src/runtime.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const stageRoot = path.join(projectRoot, "windows-app", ".app");
const stageNextRoot = path.join(stageRoot, "next");
const stageConfigRoot = path.join(stageRoot, "config");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const staticRoot = path.join(projectRoot, ".next", "static");
const publicRoot = path.join(projectRoot, "public");
const runtimeEnv = loadDesktopRuntimeEnv(projectRoot, { packaged: false });

function ensureCleanDir(directoryPath) {
  fs.rmSync(directoryPath, { force: true, recursive: true });
  fs.mkdirSync(directoryPath, { recursive: true });
}

function copyDirectory(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  fs.cpSync(sourcePath, destinationPath, {
    force: true,
    recursive: true,
  });
}

function buildStandaloneServer() {
  const nextCliPath = require.resolve("next/dist/bin/next");
  const buildResult = spawnSync(process.execPath, [nextCliPath, "build"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      BUILD_TARGET: "desktop",
    },
    stdio: "inherit",
  });

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

buildStandaloneServer();

if (!fs.existsSync(standaloneRoot)) {
  throw new Error("Next standalone output was not created. Expected .next/standalone.");
}

ensureCleanDir(stageRoot);
fs.mkdirSync(stageConfigRoot, { recursive: true });

copyDirectory(standaloneRoot, stageNextRoot);
copyDirectory(staticRoot, path.join(stageNextRoot, ".next", "static"));
copyDirectory(publicRoot, path.join(stageNextRoot, "public"));

fs.writeFileSync(
  path.join(stageConfigRoot, "runtime.env"),
  `${serializeEnv(runtimeEnv.env)}\n`,
  "utf8",
);

console.log(`Desktop web bundle staged in ${stageRoot}`);
