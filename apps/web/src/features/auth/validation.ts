import { checkPassword } from "@books/shared";

/** Minimal view of a Zod issue, so this file does not depend on Zod's types. */
interface Issue {
  path: (string | number)[];
  message: string;
  code: string;
  minimum?: unknown;
}

export type FieldErrors = Partial<Record<string, string>>;

// Messages the shared contract uses on purpose; each has its own translation.
const CONTRACT_MESSAGES = new Set([
  "invalid_phone",
  "invalid_email",
  "phone_or_email_required",
  "weak_password",
]);
const NAME_FIELDS = new Set(["businessName", "ownerName"]);

function issueKey(issue: Issue): string {
  const field = String(issue.path[0] ?? "");
  if (CONTRACT_MESSAGES.has(issue.message)) return `validation.${issue.message}`;
  if (issue.code === "too_small" && NAME_FIELDS.has(field)) return "validation.name_too_short";
  if (issue.code === "too_small" && issue.minimum === 1) return "validation.required";
  return "validation.check_field";
}

/**
 * Maps contract validation issues to one i18n key per field (first problem wins).
 * `passwordKeys` gives a more precise message per password field than "weak_password".
 */
export function toFieldErrors(
  issues: readonly Issue[],
  passwordKeys: FieldErrors = {},
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    const precise = issue.message === "weak_password" ? passwordKeys[field] : undefined;
    errors[field] ??= precise ?? issueKey(issue);
  }
  return errors;
}

/** i18n key explaining the first thing wrong with a password, if anything. */
export function passwordProblemKey(password: string, personalWords: string[] = []) {
  const [first] = checkPassword(password, personalWords);
  return first ? `passwordProblem.${first}` : undefined;
}

/** Empty inputs mean "not given", which the contract expresses as an absent field. */
export function blankToUndefined(value: string): string | undefined {
  return value.trim() === "" ? undefined : value;
}
