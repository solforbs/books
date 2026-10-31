import type { ClientSession, Connection } from "mongoose";

/**
 * Runs `work` inside a MongoDB transaction (needs a replica set, ARCH-01 §7).
 * The driver retries transient errors; any thrown error aborts everything.
 */
export async function runInTransaction<R>(
  connection: Connection,
  work: (session: ClientSession) => Promise<R>,
): Promise<R> {
  const session = await connection.startSession();
  try {
    let result: R | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as R;
  } finally {
    await session.endSession();
  }
}
