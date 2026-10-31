import { checkPassword, type PasswordProblem } from "@books/shared";
import { Circle, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const RULES: { problem: PasswordProblem; key: string }[] = [
  { problem: "too_short", key: "password.rule_length" },
  { problem: "too_simple", key: "password.rule_mix" },
  { problem: "too_common", key: "password.rule_common" },
];

interface PasswordChecklistProps {
  password: string;
  /** Names the password must not contain (owner name, business name). */
  personalWords?: string[];
}

/** Live checklist using the same shared rule as the server, so it never disagrees with it. */
export function PasswordChecklist({ password, personalWords = [] }: PasswordChecklistProps) {
  const { t } = useTranslation();
  const problems = checkPassword(password, personalWords);
  const rules = problems.includes("too_long")
    ? [...RULES, { problem: "too_long" as const, key: "password.rule_max" }]
    : RULES;

  return (
    <div className="mt-2 rounded-lg bg-slate-100 p-3">
      <p className="text-sm font-semibold text-slate-900">{t("password.checklistTitle")}</p>
      <ul className="mt-1 space-y-1" data-testid="password-checklist">
        {rules.map(({ problem, key }) => {
          const met = password.length > 0 && !problems.includes(problem);
          return (
            <li
              key={problem}
              data-rule={problem}
              data-met={met}
              className={cn(
                "flex items-start gap-2 text-sm",
                met ? "text-green-800" : "text-slate-800",
              )}
            >
              {met ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {t(key)}
                <span className="sr-only">
                  {" — "}
                  {met ? t("password.met") : t("password.notMet")}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
