import { PipeTransform } from "@nestjs/common";
import type { ZodTypeAny, output } from "zod";

/**
 * Validates and normalises a request part with a shared contract schema.
 * A failure throws the ZodError, which the global filter turns into
 * `validation_failed` with per-field details.
 *
 * Usage: `@Body(new ZodValidationPipe(loginRequestSchema)) body: LoginInput`
 */
export class ZodValidationPipe<S extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): output<S> {
    return this.schema.parse(value);
  }
}
