import { BlockList, isIP } from "node:net";

/**
 * What Fastify may trust in `X-Forwarded-For` (ARCH-01 §8, security review H1):
 * - `false`     – no proxy; the socket address is the client (local dev).
 * - a number    – that many proxy hops in front of the API are trusted; the
 *                 client is the address just before them. Production uses `1`
 *                 (the container nginx, which writes the real client IP).
 * - a list      – only these proxy IPs / CIDRs are trusted.
 * Trust-all (`true`) is refused: anyone could then forge their IP and dodge
 * per-IP rate limits by sending their own `X-Forwarded-For`.
 */
export type TrustProxy = false | number | string[];

/** proxy-addr's pre-defined ranges, handy inside Docker networks. */
const NAMED_RANGES = new Set(["loopback", "linklocal", "uniquelocal"]);

function isIpOrCidr(entry: string): boolean {
  if (NAMED_RANGES.has(entry)) return true;
  const [ip, prefix, extra] = entry.split("/");
  const version = isIP(ip ?? "");
  if (version === 0 || extra !== undefined) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= (version === 4 ? 32 : 128);
}

/** Loopback, link-local and private ranges: where our own nginx container connects from. */
const PRIVATE_NETWORKS = new BlockList();
for (const [net, prefix] of [
  ["127.0.0.0", 8],
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["169.254.0.0", 16],
] as const) {
  PRIVATE_NETWORKS.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  PRIVATE_NETWORKS.addSubnet(net, prefix, "ipv6");
}

export function isPrivateAddress(address: string): boolean {
  const ip =
    address.startsWith("::ffff:") && isIP(address.slice(7)) === 4 ? address.slice(7) : address;
  const version = isIP(ip);
  if (version === 0) return false;
  return PRIVATE_NETWORKS.check(ip, version === 4 ? "ipv4" : "ipv6");
}

/**
 * The value for Fastify's `trustProxy` option. Fastify 5.12 no longer accepts
 * a bare hop count (it cannot validate the peer), so a count becomes a
 * function: trust the first `hops` addresses, and only when the immediate peer
 * is on a private network. If the API port were ever exposed publicly, a
 * direct client's X-Forwarded-For would then simply be ignored.
 */
export function toFastifyTrustProxy(
  value: TrustProxy,
): false | string[] | ((address: string, hop: number) => boolean) {
  if (typeof value !== "number") return value;
  const hops = value;
  return (address, hop) => hop < hops && (hop > 0 || isPrivateAddress(address));
}

/** Returns the parsed value, or an error message for the config validator. */
export function parseTrustProxy(raw: string): { value: TrustProxy } | { error: string } {
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "false" || v === "0") return { value: false };
  if (v === "true") {
    return {
      error:
        "trust-all is not allowed; use a hop count (production: 1) or a list of proxy IPs/CIDRs",
    };
  }
  if (/^\d+$/.test(v)) {
    const hops = Number(v);
    if (hops > 10) return { error: "hop count must be between 1 and 10" };
    return { value: hops };
  }
  const entries = v.split(",").map((e) => e.trim());
  const bad = entries.filter((e) => !isIpOrCidr(e));
  if (bad.length > 0) {
    return { error: `not a hop count or a list of IPs/CIDRs (bad entries: ${bad.join(", ")})` };
  }
  return { value: entries };
}
