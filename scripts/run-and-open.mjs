import { spawn } from "node:child_process";
import path from "node:path";

const mode = process.argv[2] === "dev" ? "dev" : "start";
const extraArgs = process.argv.slice(3);
const port = process.env.PORT || "3000";
const url = `http://localhost:${port}/operator-live`;
const nextCli = path.join(process.cwd(), "node_modules/next/dist/bin/next");

const child = spawn(process.execPath, [nextCli, mode, ...extraArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/api/health`);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return false;
}

function tryOpen(command, args) {
  return new Promise((resolve) => {
    const opener = spawn(command, args, {
      stdio: "ignore",
      windowsHide: true,
    });

    opener.on("error", () => resolve(false));
    opener.on("exit", (code) => resolve(code === 0));
  });
}

async function openOperator() {
  if (process.platform === "darwin") {
    if (await tryOpen("open", ["-a", "Google Chrome", url])) {
      return;
    }

    if (await tryOpen("open", ["-a", "Microsoft Edge", url])) {
      return;
    }

    await tryOpen("open", [url]);
    return;
  }

  if (process.platform === "win32") {
    if (await tryOpen("cmd", ["/c", "start", "", "chrome", url])) {
      return;
    }

    if (await tryOpen("cmd", ["/c", "start", "", "msedge", url])) {
      return;
    }

    await tryOpen("cmd", ["/c", "start", "", url]);
    return;
  }

  await tryOpen("xdg-open", [url]);
}

const ready = await waitUntilReady();

if (ready) {
  await openOperator();
}
