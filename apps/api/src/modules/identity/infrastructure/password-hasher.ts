import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

/** argon2id with the library's OWASP-aligned defaults (64 MiB, t=3, p=4). */
@Injectable()
export class PasswordHasher {
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Spends the same time as a real check when the user does not exist, so
   * response timing does not reveal which phone numbers are registered.
   */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash("books-dummy-password-for-timing");
    await this.verify(await this.dummyHash, password);
  }
}
