---
name: BharatCalc Hub
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4943'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7a73'
  outline-variant: '#bdc9c1'
  surface-tint: '#006c4e'
  primary: '#005d42'
  on-primary: '#ffffff'
  primary-container: '#047857'
  on-primary-container: '#9ffdd3'
  inverse-primary: '#7bd8b1'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#734700'
  on-tertiary: '#ffffff'
  tertiary-container: '#945d00'
  on-tertiary-container: '#ffe6cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f5cc'
  primary-fixed-dim: '#7bd8b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-metric:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies modern Indian financial prosperity, precision, and clarity. It merges high-trust wealth management aesthetics with everyday utility speed. The interface balances calm financial authority with tactile digital modernity, projecting stability, mathematical exactitude, and forward-looking growth.

The visual direction follows **Tactile Minimalism & High-Trust Utility**:
- Crisp, hyper-legible numerical displays paired with soft, structured surface elevation.
- Purposeful atmospheric lighting through muted jewel-toned gradients and glass-sheen borders.
- Utilitarian density that remains airy, avoiding cognitive clutter while surfacing dense computational readouts (SIP projections, income tax regimes, GST schedules, loan amortization).
- Culturally resonant wealth signals through deep emerald tones, tempered by modern institutional slates.

## Colors

The palette balances fiscal prosperity (deep emerald), institutional clarity (cyan and mint), and proactive intelligence (tax amber alerts).

- **Primary (`#047857` / `#059669`)**: Core wealth actions, primary metrics, successful projections, active toggles, and brand anchors. Represents accumulation and financial security.
- **Secondary (`#0284c7` / `#10b981`)**: Informational highlights, breakdown charts, secondary comparison tabs, and visual contrast for compound growth markers.
- **Tertiary (`#f59e0b`)**: Crucial alerts, deduction warnings, tax liability delta calls, and dynamic fiscal year cutoff notifications.
- **Neutral (`#0f172a` to `#f8fafc`)**: Base slate continuum. High-contrast typography in `#0f172a`, muted data labels in `#64748b`, subtle panel outlines in `#e2e8f0`, and pristine canvas backing in `#f8fafc`.

In dark surface treatments or inverted stat widgets, emerald transitions to `#10b981` against a deep obsidian-slate backdrop (`#020617` / `#0f172a`) to ensure effortless optical comfort.

## Typography

The typographic hierarchy relies on **Plus Jakarta Sans** for headlines and high-impact numerical readouts to inject optimistic geometry, paired with **Inter** for dense transactional tables, parameter inputs, and micro-copy to preserve legibility under all optical conditions.

- **Tabular Figures**: All currency values (`₹`), percentages, and calculated sums must enforce `font-feature-settings: 'tnum' 1, 'cv05' 1` to prevent horizontal jitter during rapid slider or keydown calculations.
- **Hierarchy Rules**: Metric headers rely on uppercase micro-labels (`label-sm` or `label-md`) with subtle letter-spacing, immediately anchoring the oversized quantitative readouts (`data-metric`).

## Layout & Spacing

The layout is built around a centralized utility model that prioritizes mobile thumb interactions while gracefully expanding up to a focused `max-w-4xl` desktop container.

- **Mobile (<640px)**: Single-column linear stack. 16px lateral padding. Controls, inputs, and results flow in a top-down calculation sequence with sticky bottom projection totals.
- **Tablet (640px - 1024px)**: 2-column modular split. Left side hosts configuration parameters (sliders, inputs, duration selectors), while the right side pins calculated summaries, charts, and schedule previews.
- **Desktop (>=1024px)**: Fixed max-width bounded layout (`56rem` / `896px`), centering the application canvas to maintain maximum data density without eye fatigue.
- **Spacing Rhythm**: All margins, gap allocations, and surface paddings conform to a strict 4px/8px modular base scale.

## Elevation & Depth

Visual hierarchy uses a combination of **tonal layering**, **fine borders**, and **diffused ambient shadows**:

- **Layer 0 (Canvas)**: Neutral surface `#f8fafc` acting as the structural foundation.
- **Layer 1 (Cards & Input Groups)**: Crisp white (`#ffffff`) background bounded by a low-contrast border (`1px solid #e2e8f0`). Lifted by an ultra-soft drop shadow (`box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)`).
- **Layer 2 (Active Calculation Blocks & Flyouts)**: Elevated white cards featuring a primary-tinted ambient glow (`box-shadow: 0 12px 32px -4px rgba(4, 120, 87, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)`).
- **Layer 3 (Modals, Overlays & Sticky Summaries)**: Bounded by translucent borders (`rgba(226, 232, 240, 0.8)`) with `backdrop-filter: blur(12px)` and deeper grounding (`box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.12)`).

## Shapes

The design uses balanced, modern geometric roundedness (Level 2).

- **Standard Elements (0.5rem / 8px)**: Segmented controls, input fields, and compact metric badges.
- **Secondary Panels & Cards (`rounded-lg` / 1rem / 16px)**: Nested calculation boxes, chart containers, and formula tips.
- **Primary Hero Cards & Floating Dialogs (`rounded-xl` / 1.5rem / 24px)**: High-level summary modules, bottom sheet drawers, and main container wrappers.

## Components

### Buttons
- **Primary Action**: Emerald background (`#047857`), pure white text, medium weight, subtle inner highlight (`inset 0 1px 0 rgba(255,255,255,0.2)`). Hover states transition to `#059669` with an expanded shadow lift.
- **Secondary / Ghost**: Slate ghost buttons with `#0f172a` text, transparent background, and `#e2e8f0` border. Active press scales down to `0.98`.
- **Toggle Switches**: Compact pill format with smooth transition animations and an emerald-active slider track.

### Input Fields & Sliders
- **Numeric Currency Inputs**: Prominent ₹ prefix locked in slate-400, high-contrast editable text in slate-900. Base border `#cbd5e1`, shifting on `:focus` to `#047857` with a 3px ring of `rgba(4, 120, 87, 0.15)`.
- **Dual Range Sliders**: Clean horizontal slate tracks with emerald fill progress and an easy-to-target 20px thumb featuring a subtle drop shadow and white core.

### Cards & Summary Blocks
- **Hero Output Card**: Background shaded in subtle emerald slate tint (`#f0fdf4`) with a deeper `#047857` accent top border (3px) and high-visibility total return figures.
- **Comparison Panels (Old vs. New Tax Regime)**: Side-by-side balanced cards where the advantageous path receives an emerald outline and a floating "Recommended" chip.

### Chips & Badges
- **Alert Badges**: Amber-50 fill with amber-700 label and 1px border (`#fde68a`) for tax bracket warnings and surcharge notes.
- **Tenure Selector Chips**: Segmented multi-option bar (`1Y`, `3Y`, `5Y`, `10Y`) switching between slate-100 idle states and active white card fills with subtle drop shadows.

### Lists & Amortization Tables
- Alternate row striping using `#f8fafc` and `#ffffff`.
- Strict right-alignment for all monetary columns with sticky headers on scrolling tables.