export type OverlayPosition = "bottom" | "lower-third" | "top";

export type OverlayAlign = "left" | "center" | "right";

export type OverlayFontPreset = "small" | "medium" | "large";

export type OverlaySettings = {
  fontPreset: OverlayFontPreset;
  minFontPx: number;
  maxFontPx: number;
  maxLines: number;
  position: OverlayPosition;
  align: OverlayAlign;
  updatedAt: number;
};

export const OVERLAY_FONT_PRESETS: Record<
  OverlayFontPreset,
  { minFontPx: number; maxFontPx: number; maxLines: number; label: string }
> = {
  small: { minFontPx: 22, maxFontPx: 38, maxLines: 3, label: "Small" },
  medium: { minFontPx: 28, maxFontPx: 52, maxLines: 2, label: "Medium" },
  large: { minFontPx: 36, maxFontPx: 64, maxLines: 1, label: "Large" },
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  fontPreset: "medium",
  minFontPx: OVERLAY_FONT_PRESETS.medium.minFontPx,
  maxFontPx: OVERLAY_FONT_PRESETS.medium.maxFontPx,
  maxLines: OVERLAY_FONT_PRESETS.medium.maxLines,
  position: "bottom",
  align: "center",
  updatedAt: 0,
};

export function normalizeOverlaySettings(
  partial: Partial<OverlaySettings> | null | undefined
): OverlaySettings {
  if (!partial) {
    return DEFAULT_OVERLAY_SETTINGS;
  }

  const preset = partial.fontPreset ?? DEFAULT_OVERLAY_SETTINGS.fontPreset;
  const sizes = OVERLAY_FONT_PRESETS[preset];

  return {
    ...DEFAULT_OVERLAY_SETTINGS,
    ...partial,
    fontPreset: preset,
    minFontPx: partial.minFontPx ?? sizes.minFontPx,
    maxFontPx: partial.maxFontPx ?? sizes.maxFontPx,
    maxLines: partial.maxLines ?? sizes.maxLines,
  };
}

export function overlaySettingsFromPreset(
  preset: OverlayFontPreset,
  partial?: Partial<
    Pick<OverlaySettings, "position" | "align" | "updatedAt">
  >
): OverlaySettings {
  const sizes = OVERLAY_FONT_PRESETS[preset];

  return {
    fontPreset: preset,
    minFontPx: sizes.minFontPx,
    maxFontPx: sizes.maxFontPx,
    maxLines: sizes.maxLines,
    position: partial?.position ?? DEFAULT_OVERLAY_SETTINGS.position,
    align: partial?.align ?? DEFAULT_OVERLAY_SETTINGS.align,
    updatedAt: partial?.updatedAt ?? Date.now(),
  };
}
