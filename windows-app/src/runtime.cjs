const fs = require("node:fs");
const path = require("node:path");

const DESKTOP_ENV_CANDIDATES = [
  "windows-app/.env.desktop.local",
  "windows-app/.env.desktop",
];

const DEFAULT_APP_NAME = "OutboundFlow";
const DEFAULT_APP_ORIGIN = "http://127.0.0.1:3000";
const DEFAULT_PROTOCOL = "outboundflow";

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

function loadEnvFromCandidates(rootDir, candidates = DESKTOP_ENV_CANDIDATES) {
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

function readDesktopConfigFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeAppOrigin(candidate) {
  if (!candidate) {
    return DEFAULT_APP_ORIGIN;
  }

  const url = new URL(candidate);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("OUTBOUNDFLOW_APP_ORIGIN must use http or https.");
  }

  url.hash = "";
  url.pathname = "/";
  url.search = "";

  return url.toString().replace(/\/$/, "");
}

function normalizeProtocolScheme(candidate) {
  const normalized = String(candidate ?? DEFAULT_PROTOCOL)
    .trim()
    .replace(/:\/\//g, "")
    .replace(/:$/g, "")
    .toLowerCase();

  if (!normalized || !/^[a-z][a-z0-9+.-]*$/.test(normalized)) {
    throw new Error("OUTBOUNDFLOW_DESKTOP_PROTOCOL must be a valid custom URL scheme.");
  }

  if (normalized !== DEFAULT_PROTOCOL) {
    throw new Error(`Only the '${DEFAULT_PROTOCOL}' desktop protocol is supported in this build.`);
  }

  return normalized;
}

function loadDesktopConfig(rootDir, options = {}) {
  const configPath = path.join(rootDir, "windows-app", ".dist", "desktop-config.json");
  const fileConfig = options.packaged ? readDesktopConfigFile(configPath) : {};
  const runtimeEnv = loadEnvFromCandidates(rootDir, DESKTOP_ENV_CANDIDATES);
  const merged = {
    ...fileConfig,
    ...runtimeEnv.env,
    ...process.env,
  };

  return {
    appName: String(merged.OUTBOUNDFLOW_APP_NAME ?? DEFAULT_APP_NAME).trim() || DEFAULT_APP_NAME,
    appOrigin: normalizeAppOrigin(merged.OUTBOUNDFLOW_APP_ORIGIN),
    configPath: fs.existsSync(configPath) ? configPath : null,
    envFiles: runtimeEnv.files,
    protocolScheme: normalizeProtocolScheme(merged.OUTBOUNDFLOW_DESKTOP_PROTOCOL),
  };
}

function buildDesktopReturnUrl(protocolScheme) {
  return `${protocolScheme}://oauth-complete`;
}

module.exports = {
  buildDesktopReturnUrl,
  DESKTOP_ENV_CANDIDATES,
  loadDesktopConfig,
};
