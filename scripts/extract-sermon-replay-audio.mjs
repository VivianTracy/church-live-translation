/**
 * Extract the AV replay test clip for issue #24.
 *
 * Usage:
 *   npm run extract:av-replay-audio
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SOURCE_URL = "https://www.youtube.com/live/2WlnOjEMJbA";
const START = "0:47:00";
const END = "0:54:00";
const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "audio");
const PUBLIC_DIR = path.join(process.cwd(), "public", "test-audio");
const BASE_NAME = "sermon-replay-47-54";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function main() {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const fixtureWav = path.join(FIXTURE_DIR, `${BASE_NAME}.wav`);
  const publicWav = path.join(PUBLIC_DIR, `${BASE_NAME}.wav`);

  console.log(`Extracting ${START}–${END} from ${SOURCE_URL}\n`);

  run("yt-dlp", [
    `--download-sections=*${START}-${END}`,
    "-f",
    "bestaudio",
    "-x",
    "--audio-format",
    "wav",
    "--postprocessor-args",
    "ffmpeg:-ac 1 -ar 48000",
    "-o",
    path.join(FIXTURE_DIR, `${BASE_NAME}.%(ext)s`),
    SOURCE_URL,
  ]);

  if (!fs.existsSync(fixtureWav)) {
    throw new Error(`Expected output file missing: ${fixtureWav}`);
  }

  fs.copyFileSync(fixtureWav, publicWav);

  console.log(`\nSaved fixture: ${fixtureWav}`);
  console.log(`Copied for playback: ${publicWav}`);
}

main();
