import type { NamedAudio } from "../bots.js";

export function normalizeAudioKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9,\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findNamedAudio(text: string, library: NamedAudio[]): NamedAudio | null {
  if (!text.trim() || library.length === 0) return null;
  const norm = normalizeAudioKey(text);

  for (const item of library) {
    const label = normalizeAudioKey(item.label);
    if (label.length >= 3 && norm.includes(label)) return item;

    const keywords = (item.keywords || "")
      .split(",")
      .map((k) => normalizeAudioKey(k))
      .filter((k) => k.length >= 3);
    if (keywords.some((k) => norm.includes(k))) return item;
  }

  return null;
}
