export type OptionDecision = "Available" | "Under Contract";

export function detectOptionDecision(
  headline: string,
  playerName: string
): OptionDecision | null {
  const text = headline.toLowerCase();
  const name = playerName.toLowerCase();

  // Only evaluate headlines that mention the player.
  if (!text.includes(name)) {
    return null;
  }

// Ignore predictions, intentions, and future decisions.
if (
  /\b(may|might|could|expected|likely|considering|weighing)\b/i.test(text) ||
  /\b(plans|intends|expected)\s+to\b/i.test(text) ||
  /\bto\s+(exercise|decline|reject|opt)\b/i.test(text)
) {
  return null;
}

  // Player declines an option or opts out.
  if (
    /\b(declines?|declined|rejects?|rejected)\b.*\boption\b/i.test(text) ||
    /\b(opts? out|opted out|opting out)\b/i.test(text)
  ) {
    return "Available";
  }

  // Player exercises an option or opts in.
  if (
    /\b(exercises?|exercised)\b.*\boption\b/i.test(text) ||
    /\b(opts? in|opted in|opting in)\b/i.test(text)
  ) {
    return "Under Contract";
  }

  return null;
}