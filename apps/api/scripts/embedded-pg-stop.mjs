// Stops an embedded-postgres server cleanly with pg_ctl. embedded-postgres
// itself force-kills the process tree on Windows, which leaves the data
// directory locked for a while and skips the shutdown checkpoint.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

/**
 * @param {import("embedded-postgres").default} pg a started instance
 * @param {string} dataDir its data directory
 * @param {"smart" | "fast" | "immediate"} mode
 */
export function stopEmbeddedPostgres(pg, dataDir, mode = "fast") {
  const server = pg.process;
  if (!server?.spawnfile) return;
  const exe = process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl";
  spawnSync(join(dirname(server.spawnfile), exe), ["stop", "-D", dataDir, "-m", mode, "-w"], {
    stdio: "ignore",
  });
  // Already stopped: keep embedded-postgres' exit hook from killing it again.
  pg.process = undefined;
}
