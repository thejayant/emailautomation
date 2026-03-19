const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const DEV_ENV_CANDIDATES = [
  "windows-app/.env.desktop.local",
  "windows-app/.env.desktop",
  ".env.local",
  ".env",
  "env.example",
];

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1);

      if (!key) {
        return env;
      }

      env[key] = parseEnvValue(value);
      return env;
    }, {});
}

function loadEnvFromCandidates(rootDir, candidates = DEV_ENV_CANDIDATES) {
  return candidates.reduce(
    (result, relativePath) => {
      const absolutePath = path.join(rootDir, relativePath);

      if (!fs.existsSync(absolutePath)) {
        return result;
      }

      result.files.push(absolutePath);
      Object.assign(result.env, parseEnvFile(absolutePath));
      return result;
    },
    { env: {}, files: [] },
  );
}

function loadDesktopRuntimeEnv(rootDir, options = {}) {
  if (options.packaged) {
    const runtimeEnvPath = path.join(rootDir, "windows-app", ".app", "config", "runtime.env");
    return {
      env: parseEnvFile(runtimeEnvPath),
      files: fs.existsSync(runtimeEnvPath) ? [runtimeEnvPath] : [],
    };
  }

  return loadEnvFromCandidates(rootDir);
}

function serializeEnv(env) {
  return Object.entries(env)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value ?? ""}`)
    .join("\n");
}

function findFreePort(preferredPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      server.close();

      if (preferredPort && error && error.code === "EADDRINUSE") {
        resolve(findFreePort());
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      const address = server.address();
      const resolvedPort = typeof address === "object" && address ? address.port : preferredPort;

      server.close(() => {
        resolve(resolvedPort);
      });
    });

    server.listen({
      host: "127.0.0.1",
      port: preferredPort ?? 0,
    });
  });
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.ok || response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}.`);
}

function isLoopbackUrl(candidate) {
  try {
    const url = new URL(candidate);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

module.exports = {
  DEV_ENV_CANDIDATES,
  findFreePort,
  isLoopbackUrl,
  loadDesktopRuntimeEnv,
  serializeEnv,
  waitForUrl,
};
