export const MOOD_OPTIONS = [
  { id: "calm", label: "Calm", emoji: "😌", codepoint: "1F60C" },
  { id: "confident", label: "Confident", emoji: "😎", codepoint: "1F60E" },
  { id: "happy", label: "Happy", emoji: "😊", codepoint: "1F60A" },
  { id: "fear", label: "Fear", emoji: "😨", codepoint: "1F628" },
  { id: "greed", label: "Greed", emoji: "🤑", codepoint: "1F911" },
  { id: "fomo", label: "FOMO", emoji: "😬", codepoint: "1F62C" },
  { id: "frustrated", label: "Frustrated", emoji: "😤", codepoint: "1F624" },
  { id: "sad", label: "Sad", emoji: "😢", codepoint: "1F622" },
  { id: "angry", label: "Angry", emoji: "😡", codepoint: "1F621" },
  { id: "hope", label: "Hope", emoji: "🤞", codepoint: "1F91E" },
];
export function moodMeta(id) { return MOOD_OPTIONS.find((m) => m.id === id) || null; }
// Twemoji SVG images rather than native OS emoji characters — native
// rendering varies wildly in size/style across operating systems (and
// looks notably dated on some), while an image can be sized explicitly
// and looks identical everywhere.
export const TWEMOJI_CDN = "https://cdn.jsdelivr.net/npm/@svgmoji/twemoji@2.0.0/svg/";
