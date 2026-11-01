import { describe, expect, it } from "vitest";
import { loadAppConfig } from "../app-config";
import { toFastifyTrustProxy } from "../trust-proxy";

const valid = {
  DATABASE_URL: "postgres://books_app:pw@127.0.0.1:5433/books",
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
    expect(() => loadAppConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadAppConfig({ ...valid, DATABASE_URL: "mongodb://localhost/books" })).toThrow(
      /DATABASE_URL: must be a postgres:\/\/ URL/,
    );
    expect(() => loadAppConfig({ ...valid, DATABASE_MIGRATION_URL: "nope" })).toThrow(
      /DATABASE_MIGRATION_URL/,
    );
    expect(
      loadAppConfig({ ...valid, DATABASE_MIGRATION_URL: "postgresql://o:p@db/books" })
        .DATABASE_MIGRATION_URL,
    ).toBe("postgresql://o:p@db/books");
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

  it("TRUST_PROXY: false, a hop count or an IP/CIDR list; never trust-all", () => {
    expect(loadAppConfig({ ...valid, TRUST_PROXY: "false" }).TRUST_PROXY).toBe(false);
    expect(loadAppConfig({ ...valid, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
    expect(loadAppConfig({ ...valid, TRUST_PROXY: " 2 " }).TRUST_PROXY).toBe(2);
    expect(
      loadAppConfig({ ...valid, TRUST_PROXY: "10.0.0.2, 172.18.0.0/16,::1,loopback" }).TRUST_PROXY,
    ).toEqual(["10.0.0.2", "172.18.0.0/16", "::1", "loopback"]);

    expect(() => loadAppConfig({ ...valid, TRUST_PROXY: "true" })).toThrow(
      /TRUST_PROXY: trust-all is not allowed/,
    );
    for (const bad of ["yes", "10.0.0.300", "10.0.0.0/33", "1.2.3.4/8/1", "99"]) {
      expect(() => loadAppConfig({ ...valid, TRUST_PROXY: bad }), bad).toThrow(/TRUST_PROXY/);
    }
  });

  it("a hop count trusts the immediate peer only when it is on a private network", () => {
    const trust = toFastifyTrustProxy(1) as (address: string, hop: number) => boolean;
    for (const proxy of [
      "127.0.0.1",
      "172.18.0.5",
      "10.1.2.3",
      "192.168.1.9",
      "::1",
      "::ffff:10.0.0.2",
    ]) {
      expect(trust(proxy, 0), proxy).toBe(true);
    }
    expect(trust("8.8.8.8", 0)).toBe(false);
    expect(trust("41.90.1.2", 1)).toBe(false);
    expect(toFastifyTrustProxy(false)).toBe(false);
    expect(toFastifyTrustProxy(["10.0.0.2"])).toEqual(["10.0.0.2"]);
  });

  it("refuses the .env.example placeholder secrets in production only", () => {
    const placeholders = {
      ...valid,
      JWT_ACCESS_SECRET: "replace-with-a-long-random-access-secret",
      COOKIE_SECURE: "true",
    };
    expect(loadAppConfig(placeholders).NODE_ENV).toBe("development");
    expect(() => loadAppConfig({ ...placeholders, NODE_ENV: "production" })).toThrow(/placeholder/);
    expect(() =>
      loadAppConfig({
        ...valid,
        NODE_ENV: "production",
        COOKIE_SECURE: "true",
        JWT_REFRESH_SECRET: "replace-with-a-different-long-random-refresh-secret",
      }),
    ).toThrow(/placeholder/);
  });
});
