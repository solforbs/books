import { Module } from "@nestjs/common";
import { LedgerService } from "./application/ledger.service";
import { LedgerEntriesRepository } from "./infrastructure/ledger-entries.repository";
import { LedgerLinesRepository } from "./infrastructure/ledger-lines.repository";

/** The double-entry books behind stock value, supplier debt and money places (ARCH-02). */
@Module({
  providers: [LedgerEntriesRepository, LedgerLinesRepository, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
