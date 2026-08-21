import { strings, type StringKey } from "../../i18n";

interface BilingualTextProps {
  key: StringKey;
  lang?: "en" | "cy";
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "div";
  className?: string;
}

export function BilingualText({
  key,
  lang = "en",
  as: Tag = "p",
  className = "",
}: BilingualTextProps) {
  const s = strings[key];
  if (!s) return null;

  if (lang === "cy") {
    return (
      <div className={className}>
        <Tag className="text-zisamale-dark">{s.cy}</Tag>
        <Tag className="text-neutral text-sm mt-0.5">{s.en}</Tag>
      </div>
    );
  }

  return (
    <Tag className={`text-zisamale-dark ${className}`}>
      {lang === "en" ? s.en : s.cy}
    </Tag>
  );
}
