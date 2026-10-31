import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, loadAppConfig } from "./app-config";

/** Provides the Zod-validated config everywhere via `@Inject(APP_CONFIG)`. */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadAppConfig() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
