import { Inject, Injectable } from "@nestjs/common";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyReply, FastifyRequest } from "fastify";
import { APP_CONFIG, type AppConfig } from "../../../config/app-config";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_PATH,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../domain/auth-policy";
import type { IssuedTokens } from "../application/session-issuer";

/** Tokens live only in httpOnly, SameSite=Strict cookies; JavaScript never sees them. */
@Injectable()
export class AuthCookies {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private options(path: string, maxAge: number): CookieSerializeOptions {
    return { httpOnly: true, secure: this.config.COOKIE_SECURE, sameSite: "strict", path, maxAge };
  }

  setAccess(reply: FastifyReply, token: string): void {
    reply.setCookie(
      ACCESS_COOKIE,
      token,
      this.options(ACCESS_COOKIE_PATH, ACCESS_TOKEN_TTL_SECONDS),
    );
  }

  setAll(reply: FastifyReply, tokens: IssuedTokens): void {
    this.setAccess(reply, tokens.accessToken);
    reply.setCookie(
      REFRESH_COOKIE,
      tokens.refreshToken,
      this.options(REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL_SECONDS),
    );
  }

  clear(reply: FastifyReply): void {
    reply.clearCookie(ACCESS_COOKIE, this.options(ACCESS_COOKIE_PATH, 0));
    reply.clearCookie(REFRESH_COOKIE, this.options(REFRESH_COOKIE_PATH, 0));
  }

  readAccess(req: FastifyRequest): string | undefined {
    return req.cookies?.[ACCESS_COOKIE] || undefined;
  }

  readRefresh(req: FastifyRequest): string | undefined {
    return req.cookies?.[REFRESH_COOKIE] || undefined;
  }
}
