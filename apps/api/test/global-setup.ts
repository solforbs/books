import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { GlobalSetupContext } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/**
 * One in-memory single-node replica set for the whole run (transactions need a
 * replica set). Each test app uses its own database inside it.
 */
export default async function setup({ provide }: GlobalSetupContext) {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  provide("mongoUri", replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
