// Local development database: a single-node MongoDB replica set (transactions
// need a replica set) that keeps its data in apps/api/.data/mongo between runs.
// No Docker or MongoDB install needed; the MongoDB binary is downloaded once
// by mongodb-memory-server and cached.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const PORT = Number(process.env.DEV_DB_PORT ?? 27018);
const dbPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.data/mongo");
mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: PORT, dbPath }],
});

console.warn(`Dev database ready: mongodb://127.0.0.1:${PORT}/books?replicaSet=rs0`);
console.warn(`Data folder: ${dbPath} (delete it to start fresh)`);

const stop = async () => {
  // Keep the data on disk: stop the server without deleting the folder.
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
