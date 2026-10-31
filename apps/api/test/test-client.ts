import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from "@books/shared";

type Method = "GET" | "POST";

export interface SetCookie {
  name: string;
  value: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  sameSite?: string;
  secure?: boolean;
}

export interface TestResponse {
  statusCode: number;
  body: string;
  json: <T = any>() => T; // eslint-disable-line @typescript-eslint/no-explicit-any
  headers: Record<string, unknown>;
  cookies: SetCookie[];
}

export interface RequestOptions {
  body?: unknown;
  /** Send the CSRF header on non-GET requests (default true). */
  csrf?: boolean;
  /** Replace the jar for this one request (e.g. to replay an old refresh token). */
  cookies?: Record<string, string>;
}

/** A tiny browser stand-in: remembers cookies between requests, like the PWA would. */
export class TestClient {
  readonly jar = new Map<string, string>();

  constructor(private readonly app: NestFastifyApplication) {}

  get(url: string, opts: RequestOptions = {}): Promise<TestResponse> {
    return this.request("GET", url, opts);
  }

  post(url: string, body?: unknown, opts: RequestOptions = {}): Promise<TestResponse> {
    return this.request("POST", url, { ...opts, body });
  }

  async request(method: Method, url: string, opts: RequestOptions = {}): Promise<TestResponse> {
    const headers: Record<string, string> = {};
    if (method !== "GET" && opts.csrf !== false) headers[CLIENT_HEADER] = CLIENT_HEADER_VALUE;
    const res = await this.app.inject({
      method,
      url: `/api/v1${url}`,
      headers,
      cookies: opts.cookies ?? Object.fromEntries(this.jar),
      ...(opts.body === undefined ? {} : { payload: opts.body as object }),
    });
    const cookies = res.cookies as SetCookie[];
    for (const c of cookies) {
      const expired = c.maxAge === 0 || (c.expires && c.expires.getTime() <= Date.now());
      if (expired || c.value === "") this.jar.delete(c.name);
      else this.jar.set(c.name, c.value);
    }
    return {
      statusCode: res.statusCode,
      body: res.body,
      json: () => res.json(),
      headers: res.headers,
      cookies,
    };
  }
}
