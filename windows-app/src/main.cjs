const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
} = require("electron");
const {
  findFreePort,
  isLoopbackUrl,
  loadDesktopRuntimeEnv,
  waitForUrl,
} = require("./runtime.cjs");

const isDevelopment = process.env.OUTBOUNDFLOW_DESKTOP_MODE === "development" || !app.isPackaged;
const projectRoot = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, "..", "..");

let mainWindow = null;
let nextProcess = null;
let desktopCallbackServer = null;
let runtimeState = null;
let isShuttingDown = false;

function getIconPath() {
  return path.join(projectRoot, "windows-app", "app-icon.ico");
}

function getAppOrigin() {
  return runtimeState?.appUrl ? new URL(runtimeState.appUrl).origin : null;
}

async function buildRuntimeState() {
  const runtimeEnv = loadDesktopRuntimeEnv(projectRoot, { packaged: app.isPackaged });
  const appPort = await findFreePort(3000);
  const desktopCallbackPort = await findFreePort(appPort + 1);
  const appUrl = `http://127.0.0.1:${appPort}`;
  const desktopCallbackUrl = `http://127.0.0.1:${desktopCallbackPort}/oauth/gmail-complete`;

  return {
    appPort,
    appUrl,
    desktopCallbackPort,
    desktopCallbackUrl,
    env: runtimeEnv.env,
    envFiles: runtimeEnv.files,
  };
}

function getNextDevCliPath() {
  return require.resolve("next/dist/bin/next");
}

function getStandaloneServerPath() {
  return path.join(projectRoot, "windows-app", ".app", "next", "server.js");
}

async function startNextServer() {
  runtimeState = await buildRuntimeState();

  const env = {
    ...process.env,
    ...runtimeState.env,
    BUILD_TARGET: "desktop",
    GOOGLE_OAUTH_REDIRECT_URI: `${runtimeState.appUrl}/api/gmail/callback`,
    HOSTNAME: "127.0.0.1",
    NEXT_PUBLIC_APP_URL: runtimeState.appUrl,
    PORT: String(runtimeState.appPort),
  };

  if (isDevelopment) {
    nextProcess = spawn(
      process.execPath,
      [
        getNextDevCliPath(),
        "dev",
        "--hostname",
        "127.0.0.1",
        "-p",
        String(runtimeState.appPort),
      ],
      {
        cwd: projectRoot,
        env,
        stdio: "inherit",
      },
    );
  } else {
    nextProcess = spawn(process.execPath, [getStandaloneServerPath()], {
      cwd: path.dirname(getStandaloneServerPath()),
      env,
      stdio: "inherit",
    });
  }

  nextProcess.once("exit", (code, signal) => {
    nextProcess = null;

    if (isShuttingDown) {
      return;
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? "unknown"}`;
    console.error(`Desktop web server exited unexpectedly with ${detail}.`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("desktop:server-crashed");
    }
  });

  await waitForUrl(runtimeState.appUrl);
}

async function stopNextServer() {
  if (!nextProcess) {
    return;
  }

  const processToStop = nextProcess;
  nextProcess = null;

  await new Promise((resolve) => {
    processToStop.once("exit", resolve);
    processToStop.kill();
    setTimeout(resolve, 5_000);
  });
}

async function startDesktopCallbackServer() {
  await new Promise((resolve, reject) => {
    desktopCallbackServer = http.createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

      if (requestUrl.pathname !== "/oauth/gmail-complete") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }

      const status = requestUrl.searchParams.get("status");
      const message = requestUrl.searchParams.get("message");
      const profileUrl = new URL("/profile", runtimeState.appUrl);

      if (status === "connected" || status === "error") {
        profileUrl.searchParams.set("gmail", status);
      }

      if (message) {
        profileUrl.searchParams.set("message", message);
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        if (status === "connected" || status === "error") {
          await mainWindow.loadURL(profileUrl.toString());
        } else {
          mainWindow.webContents.reloadIgnoringCache();
        }

        mainWindow.show();
        mainWindow.focus();
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OutboundFlow</title>
    <style>
      body {
        align-items: center;
        background: #f5f0e7;
        color: #11273f;
        display: grid;
        font-family: "Segoe UI", sans-serif;
        margin: 0;
        min-height: 100vh;
        padding: 32px;
      }
      main {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(17, 39, 63, 0.08);
        border-radius: 24px;
        max-width: 520px;
        padding: 28px 32px;
        text-align: center;
      }
      h1 {
        font-size: 28px;
        margin: 0 0 12px;
      }
      p {
        line-height: 1.7;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Return to OutboundFlow</h1>
      <p>Your Gmail connection was handled by the desktop app. You can close this browser tab now.</p>
    </main>
  </body>
</html>`);
    });

    desktopCallbackServer.once("error", reject);
    desktopCallbackServer.listen(runtimeState.desktopCallbackPort, "127.0.0.1", resolve);
  });
}

async function stopDesktopCallbackServer() {
  if (!desktopCallbackServer) {
    return;
  }

  const serverToStop = desktopCallbackServer;
  desktopCallbackServer = null;

  await new Promise((resolve, reject) => {
    serverToStop.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function isExternalUrl(targetUrl) {
  const appOrigin = getAppOrigin();

  if (!appOrigin) {
    return false;
  }

  try {
    return new URL(targetUrl).origin !== appOrigin;
  } catch {
    return false;
  }
}

function attachNavigationGuards(windowToProtect) {
  windowToProtect.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  windowToProtect.webContents.on("will-navigate", (event, url) => {
    if (!isExternalUrl(url)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });

  windowToProtect.webContents.on("will-redirect", (event, url) => {
    if (!isExternalUrl(url)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    backgroundColor: "#f5f0e7",
    height: 960,
    icon: getIconPath(),
    minHeight: 800,
    minWidth: 1280,
    show: false,
    title: "OutboundFlow",
    width: 1520,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false,
    },
  });

  attachNavigationGuards(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  await mainWindow.loadURL(runtimeState.appUrl);
}

async function resolveGmailConnectUrl() {
  const connectUrl = new URL("/api/gmail/connect", runtimeState.appUrl);
  connectUrl.searchParams.set("desktopCallbackUrl", runtimeState.desktopCallbackUrl);

  const sessionCookies = await mainWindow.webContents.session.cookies.get({
    url: runtimeState.appUrl,
  });
  const cookieHeader = sessionCookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  const response = await fetch(connectUrl, {
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
    redirect: "manual",
  });

  const location = response.headers.get("location");

  if (!response.ok && !(response.status >= 300 && response.status < 400)) {
    throw new Error(`Failed to start Gmail connection (${response.status}).`);
  }

  if (!location) {
    throw new Error("Gmail connection did not return a redirect URL.");
  }

  return new URL(location, connectUrl).toString();
}

ipcMain.handle("desktop:connect-gmail", async () => {
  if (!runtimeState || !mainWindow) {
    return {
      ok: false,
      error: "Desktop runtime is still starting. Please try again.",
    };
  }

  try {
    const externalUrl = await resolveGmailConnectUrl();

    if (!isLoopbackUrl(runtimeState.desktopCallbackUrl)) {
      throw new Error("Desktop callback URL is not using a loopback host.");
    }

    await shell.openExternal(externalUrl);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not launch the Gmail OAuth flow.",
    };
  }
});

async function bootstrap() {
  await startNextServer();
  await startDesktopCallbackServer();
  await createMainWindow();
}

async function shutdown() {
  isShuttingDown = true;

  await Promise.allSettled([stopDesktopCallbackServer(), stopNextServer()]);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      await bootstrap();
    } catch (error) {
      console.error("Failed to start OutboundFlow Desktop.", error);
      app.quit();
    }
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length > 0 || !runtimeState) {
      return;
    }

    await createMainWindow();
  });

  app.on("before-quit", () => {
    isShuttingDown = true;
  });

  app.on("window-all-closed", async () => {
    await shutdown();

    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
