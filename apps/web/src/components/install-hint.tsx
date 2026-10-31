import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

const DISMISS_KEY = "books.installHintDismissed";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return standalone || displayMode;
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * iPhone keeps offline data only for apps added to the Home Screen (ARCH-01 §9), so we guide
 * iPhone users there. Browsers with an install prompt (Android, desktop Chrome) get a button.
 */
export function InstallHint() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => wasDismissed() || isInstalled());
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const ios = isIos();
  if (dismissed || (!ios && !prompt)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not fatal: the hint shows again next time.
    }
  };

  return (
    <aside className="rounded-xl border-2 border-brand bg-brand-light p-4 text-slate-900">
      <h2 className="font-heading text-lg font-bold">{t("install.title")}</h2>
      <p className="mt-1 text-base">{ios ? t("install.iosBody") : t("install.androidBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!ios && prompt && (
          <Button onClick={() => void prompt.prompt().then(() => setPrompt(null))}>
            {t("install.installButton")}
          </Button>
        )}
        <Button variant="ghost" onClick={dismiss}>
          {t("install.dismiss")}
        </Button>
      </div>
    </aside>
  );
}
