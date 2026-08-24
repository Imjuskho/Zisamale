/** "antenatal_care" → "Antenatal care" */
export function humanize(code: string): string {
  const words = code.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
