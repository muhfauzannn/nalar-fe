/** Interim hypotheses may cover the whole utterance or just the unfinished suffix. */
export function liveInputPreview(finalText: string, interimText: string) {
  const final = finalText.trim();
  const interim = interimText.trim();
  if (!final) return interim;
  if (!interim) return final;
  const finalLower = final.toLocaleLowerCase();
  const interimLower = interim.toLocaleLowerCase();
  if (interimLower.startsWith(finalLower)) return interim;
  if (finalLower.endsWith(interimLower)) return final;
  return `${final} ${interim}`;
}
