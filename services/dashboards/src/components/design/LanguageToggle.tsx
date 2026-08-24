import { Icon } from "./Icon";
import { useLanguage } from "./LanguageContext";

interface LanguageToggleProps {
  variant?: "compact" | "full";
}

export function LanguageToggle({ variant = "full" }: LanguageToggleProps) {
  const { language, toggle, setLanguage } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="language-toggle-compact"
        aria-label={language === "en" ? "Switch to Chichewa" : "Switch to English"}
      >
        <Icon name="Globe" size={14} />
        <span className="uppercase font-bold">{language === "en" ? "EN" : "NY"}</span>
      </button>
    );
  }

  return (
    <div className="language-toggle-full" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLanguage("ny")}
        className={language === "ny" ? "active" : ""}
        aria-pressed={language === "ny"}
      >
        Chichewa
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={language === "en" ? "active" : ""}
        aria-pressed={language === "en"}
      >
        English
      </button>
    </div>
  );
}
