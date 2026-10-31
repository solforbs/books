import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, type InputProps } from "@/components/ui/input";

/** Password box with a Show/Hide button, so people can check what they typed. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  (props, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
      <div className="flex gap-2">
        <Input ref={ref} type={visible ? "text" : "password"} {...props} />
        <button
          type="button"
          className="min-h-tap min-w-tap shrink-0 rounded-lg border-2 border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand/30"
          aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? t("common.hide") : t("common.show")}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
