import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../app-config";

const valid = {
  MONGODB_URI: "mongodb://localhost:27017/books?replicaSet=rs0",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  WEB_ORIGIN: "http://localhost:5173",
};

describe("loadAppConfig", () => {
  it("applies defaults", () => {
    const config = loadAppConfig(valid);
    expect(config).toMatchObject({
      NODE_ENV: "development",
      PORT: 3000,
      COOKIE_SECURE: false,
      TRUST_PROXY: false,
    });
  });

  it("parses booleans and numbers from strings", () => {
    const config = loadAppConfig({ ...valid, PORT: "8080", COOKIE_SECURE: "true" });
    expect(config.PORT).toBe(8080);
    expect(config.COOKIE_SECURE).toBe(true);
  });

  it("fails fast on missing or weak values, without echoing secrets", () => {
    expect(() => loadAppConfig({})).toThrow(/MONGODB_URI/);
    expect(() => loadAppConfig({ ...valid, JWT_ACCESS_SECRET: "short-secret" })).toThrow(
      /JWT_ACCESS_SECRET: must be at least 32 characters/,
    );
    expect(() => loadAppConfig({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /must differ/,
    );
    try {
      loadAppConfig({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET });
    } catch (e) {
      expect((e as Error).message).not.toContain(valid.JWT_ACCESS_SECRET);
    }
  });

  it("requires secure cookies in production", () => {
    expect(() => loadAppConfig({ ...valid, NODE_ENV: "production" })).toThrow(/COOKIE_SECURE/);
    expect(
      loadAppConfig({ ...valid, NODE_ENV: "production", COOKIE_SECURE: "true" }).NODE_ENV,
    ).toBe("production");
  });
});
