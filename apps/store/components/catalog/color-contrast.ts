// Pick a readable foreground (ink/bone) for an accord color chip. Ported from
// apps/web/src/lib/color-contrast.ts so accord badges stay legible regardless of
// the swatch hue. Pure, deterministic — safe in both server and client trees.

const HEX_COLOR = /^#?([0-9a-f]{6})$/i;

export const getReadableTextColor = (hex: string, fallback = '#ffffff'): string => {
  const match = HEX_COLOR.exec(hex.trim());
  const value = match?.[1];
  if (!value) return fallback;

  const rgb = parseInt(value, 16);
  const red = (rgb >> 16) & 0xff;
  const green = (rgb >> 8) & 0xff;
  const blue = rgb & 0xff;
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000;

  return yiq >= 170 ? '#1c1917' : '#ffffff';
};
