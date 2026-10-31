import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

interface RecoveryCodesProps {
  codes: string[];
  onContinue: () => void;
}

function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Shown once after sign-up. The owner must confirm the codes are saved before going on. */
export function RecoveryCodes({ codes, onContinue }: RecoveryCodesProps) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const fileText = [t("recovery.fileHeader"), "", ...codes, ""].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <Card>
      <CardTitle>{t("recovery.title")}</CardTitle>
      <CardDescription>{t("recovery.intro")}</CardDescription>
      <ol
        className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-slate-100 p-4 font-mono text-lg sm:grid-cols-2"
        data-testid="recovery-codes"
      >
        {codes.map((code) => (
          <li key={code} className="select-all tracking-wider">
            {code}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" block onClick={() => void copy()}>
          {t("recovery.copy")}
        </Button>
        <Button
          variant="secondary"
          block
          onClick={() => downloadText("books-recovery-codes.txt", fileText)}
        >
          {t("recovery.download")}
        </Button>
      </div>
      {copyState === "copied" && (
        <Alert variant="success" className="mt-3">
          {t("recovery.copied")}
        </Alert>
      )}
      {copyState === "failed" && (
        <Alert variant="error" className="mt-3">
          {t("recovery.copyFailed")}
        </Alert>
      )}
      <label className="mt-5 flex min-h-tap cursor-pointer items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          className="h-6 w-6 accent-brand"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        {t("recovery.confirm")}
      </label>
      <Button className="mt-4" block disabled={!saved} onClick={onContinue}>
        {t("common.continue")}
      </Button>
    </Card>
  );
}
