// Builds the inline `style` object that applies a supplier's brand colors
// as CSS variables. We override the same custom properties Tailwind v4 uses
// (`--background`, `--primary`, `--primary-foreground`) so every existing
// utility class (`bg-primary`, `text-primary`, `bg-background`, …) picks
// up the brand color automatically on the wizard pages.
//
// A dedicated `--brand-title` is also set and consumed explicitly for
// page titles where we want the brand to differ from the primary.

import { CSSProperties } from 'react';

export interface BrandColors {
  color_background: string | null;
  color_primary: string | null;
  color_primary_foreground: string | null;
  color_title: string | null;
}

export function brandThemeStyle(supplier: BrandColors | null | undefined): CSSProperties {
  if (!supplier) return {};
  const vars: Record<string, string> = {};
  if (supplier.color_background) vars['--background'] = supplier.color_background;
  if (supplier.color_primary) vars['--primary'] = supplier.color_primary;
  if (supplier.color_primary_foreground)
    vars['--primary-foreground'] = supplier.color_primary_foreground;
  if (supplier.color_title) vars['--brand-title'] = supplier.color_title;
  return vars as CSSProperties;
}
