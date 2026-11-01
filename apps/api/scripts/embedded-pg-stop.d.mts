import type EmbeddedPostgres from "embedded-postgres";

export declare function stopEmbeddedPostgres(
  pg: EmbeddedPostgres,
  dataDir: string,
  mode?: "smart" | "fast" | "immediate",
): void;
