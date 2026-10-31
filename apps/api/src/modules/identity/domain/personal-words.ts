/**
 * Words a person's new password must not contain (password policy
 * "too_common"): their full name, each name part and their email prefix.
 */
export function personalWords(user: { name: string; email?: string | null }): string[] {
  return [user.name, ...user.name.split(/\s+/), user.email?.split("@")[0] ?? ""];
}
