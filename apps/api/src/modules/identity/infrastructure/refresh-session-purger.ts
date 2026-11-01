import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { safeErrorMessage } from "../../../common/errors/safe-error-message";
import { RefreshSessionsRepository } from "./refresh-sessions.repository";

const PURGE_EVERY_MS = 60 * 60 * 1000;

/**
 * Replaces MongoDB's TTL index: once an hour, refresh-token rows that expired
 * more than a week ago are removed. Safe to run on several API instances.
 */
@Injectable()
export class RefreshSessionPurger implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RefreshSessionPurger.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly sessions: RefreshSessionsRepository) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.purge(), PURGE_EVERY_MS);
    // Never keep the process alive just for this.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async purge(): Promise<number> {
    try {
      return await this.sessions.purgeExpired();
    } catch (err) {
      this.logger.error(`refresh session purge failed: ${safeErrorMessage(err)}`);
      return 0;
    }
  }
}
