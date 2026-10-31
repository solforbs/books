import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  recoverRequestSchema,
  registerRequestSchema,
  selectBusinessRequestSchema,
  type RegisterResponse,
  type SessionResponse,
} from "@books/shared";
import { AppError } from "../../../common/errors/app-error";
import { Public } from "../../../common/security/public.decorator";
import { StrictRateLimit } from "../../../common/security/rate-limit";
import { ReqMeta, type RequestMeta } from "../../../common/security/request-meta";
import { ZodValidationPipe } from "../../../common/validation/zod-validation.pipe";
import {
  ChangePasswordUseCase,
  type ChangePasswordInput,
} from "../application/change-password.use-case";
import { GetSessionUseCase } from "../application/get-session.use-case";
import { LoginUseCase, type LoginInput } from "../application/login.use-case";
import { LogoutUseCase } from "../application/logout.use-case";
import { RecoverUseCase, type RecoverInput } from "../application/recover.use-case";
import { RefreshUseCase } from "../application/refresh.use-case";
import { RegisterUseCase, type RegisterInput } from "../application/register.use-case";
import { SelectBusinessUseCase } from "../application/select-business.use-case";
import type { AuthContext } from "../domain/auth-context";
import { AuthCookies } from "./auth-cookies";
import { CurrentUser } from "./current-user.decorator";

/** HTTP wiring only: validate with shared schemas, call a use case, set cookies. */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly cookies: AuthCookies,
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly selectBusinessUseCase: SelectBusinessUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly recoverUseCase: RecoverUseCase,
  ) {}

  @Public()
  @StrictRateLimit()
  @Post("register")
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterInput,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<RegisterResponse> {
    const { response, tokens } = await this.registerUseCase.execute(body, meta);
    this.cookies.setAll(reply, tokens);
    return response;
  }

  @Public()
  @StrictRateLimit()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginInput,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    const { response, tokens } = await this.loginUseCase.execute(body, meta);
    this.cookies.setAll(reply, tokens);
    return response;
  }

  @Post("select-business")
  @HttpCode(200)
  async selectBusiness(
    @Body(new ZodValidationPipe(selectBusinessRequestSchema)) body: { tenantId: string },
    @CurrentUser() auth: AuthContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    const { response, accessToken } = await this.selectBusinessUseCase.execute(auth, body.tenantId);
    this.cookies.setAccess(reply, accessToken);
    return response;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    try {
      const { response, tokens } = await this.refreshUseCase.execute(
        this.cookies.readRefresh(req),
        meta,
      );
      this.cookies.setAll(reply, tokens);
      return response;
    } catch (err) {
      // A racing tab must keep the fresh cookies the winning tab just received.
      if (!(err instanceof AppError && err.code === "refresh_in_progress")) {
        this.cookies.clear(reply);
      }
      throw err;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.logoutUseCase.execute(this.cookies.readRefresh(req), this.cookies.readAccess(req));
    this.cookies.clear(reply);
  }

  @Get("me")
  me(@CurrentUser() auth: AuthContext): Promise<SessionResponse> {
    return this.getSessionUseCase.execute(auth);
  }

  @StrictRateLimit()
  @Post("change-password")
  @HttpCode(204)
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordRequestSchema)) body: ChangePasswordInput,
    @CurrentUser() auth: AuthContext,
    @ReqMeta() meta: RequestMeta,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(auth, body, meta);
  }

  @Public()
  @StrictRateLimit()
  @Post("recover")
  @HttpCode(204)
  async recover(
    @Body(new ZodValidationPipe(recoverRequestSchema)) body: RecoverInput,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.recoverUseCase.execute(body, meta);
    this.cookies.clear(reply);
  }
}
