---
name: Acsent
colors:
  surface: "#fcf8fc"
  surface-dim: "#ddd9dd"
  surface-bright: "#fcf8fc"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f7f2f6"
  surface-container: "#f1edf1"
  surface-container-high: "#ebe7eb"
  surface-container-highest: "#e5e1e5"
  on-surface: "#1c1b1e"
  on-surface-variant: "#47464e"
  inverse-surface: "#313033"
  inverse-on-surface: "#f4eff3"
  outline: "#78767f"
  outline-variant: "#c8c5cf"
  surface-tint: "#5d5a83"
  primary: "#000000"
  on-primary: "#ffffff"
  primary-container: "#19173c"
  on-primary-container: "#837fab"
  inverse-primary: "#c6c1f1"
  secondary: "#006c4c"
  on-secondary: "#ffffff"
  secondary-container: "#74f7c1"
  on-secondary-container: "#007150"
  tertiary: "#000000"
  on-tertiary: "#ffffff"
  tertiary-container: "#2c1700"
  on-tertiary-container: "#a07d5a"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e3dfff"
  primary-fixed-dim: "#c6c1f1"
  on-primary-fixed: "#19173c"
  on-primary-fixed-variant: "#45426a"
  secondary-fixed: "#77fac4"
  secondary-fixed-dim: "#58dda9"
  on-secondary-fixed: "#002115"
  on-secondary-fixed-variant: "#005139"
  tertiary-fixed: "#ffdcbd"
  tertiary-fixed-dim: "#e8bf98"
  on-tertiary-fixed: "#2c1700"
  on-tertiary-fixed-variant: "#5d4123"
  background: "#fcf8fc"
  on-background: "#1c1b1e"
  surface-variant: "#e5e1e5"
  accent-lavender: "#D3C5F8"
  background-alt: "#F8F8FC"
  text-muted: "#6B6B80"
  white: "#FFFFFF"
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.2"
  h1-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: "600"
    lineHeight: "1.3"
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: "600"
    lineHeight: "1.3"
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: 0.02em
  button:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "600"
    lineHeight: "1"
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 24px
  margin-mobile: 20px
  section-gap: 80px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

# Acsent Web Design System & UI Guidelines

## 1. Typography

- **Primary Font Family:** **Poppins** (Used across all headings, body text, buttons, and UI elements).
- **Headings (H1, H2, H3):**
  - Weight: Bold / Semi-Bold
  - Color: Primary Dark Navy
  - Style: Clean, geometric, easily readable.
- **Body Text:**
  - Weight: Regular
  - Color: Muted Gray
  - Line-height: Spacious (approx. 1.5 - 1.6) for readability.

## 2. Color Palette

Based on the visual analysis of the screenshots, here is the inferred color palette:

- **Primary Dark (Text, Footer, CTA Buttons):** `#18153A` (Dark Navy/Deep Purple)
- **Primary Accent (Highlights, Badges, Elements):** `#4BD29F` (Mint Green)
- **Secondary Accent (Alternative Highlights):** `#D3C5F8` (Soft Lavender/Purple)
- **Background (Body):** `#F8F8FC` (Very Light Lavender/Gray tint)
- **Surface (Cards, Modals):** `#FFFFFF` (White)
- **Text Muted (Paragraphs, Subtitles):** `#6B6B80` (Medium Gray)

## 3. UI Components

### Buttons

- **Primary Button (e.g., "Start Now", "Login"):** Solid Primary Dark background, White text. Highly rounded corners (pill-shape). No visible border.
- **Interactive UI Buttons (e.g., inside mockups):** Also utilize the pill-shape, some with icons.

### Cards

- **Style:** Clean white (`#FFFFFF`) background.
- **Border Radius:** Rounded corners (approx. 16px - 20px).
- **Shadow:** Soft, diffuse drop-shadow (e.g., `box-shadow: 0 10px 30px rgba(0,0,0,0.05);`).
- **Usage:** Used for Testimonials, Test Types overview, and floating UI mockups.

### Badges & Tags

- Used for scores (e.g., "IELTS Band 7").
- Light green or light purple background with darker contrasting text.
- Pill-shaped border radius.

### Section Headers (Feature Sections)

- Unique styling for section subtitles (e.g., "Question Bank", "Mock Test").
- Text is placed over an offset rectangular highlight block in mint green or soft purple.

## 4. Layout & Structure

- **Navigation:** Top sticky/fixed navbar. Logo on the left, centered links (Home, About Us, Blog, Features), and right-aligned Language Toggle and Login button.
- **Hero Section:** Left-aligned text (Headline, subtext, CTA) with a large custom illustration on the right. Wavy bottom border transitioning to the next section.
- **Stats Section:** Centered, large typography for numbers, clean layout.
- **Feature Alternation:** The features sections (Speaking, Question Bank, Analysis) use an alternating left-right (zig-zag) layout combining text descriptions with overlapping UI mockups.
- **FAQ:** Accordion style list, clean dividers.
- **Footer:** Dark background (`#18153A`). Four-column layout (Brand info, About, Product, Help).

## 5. Imagery & Illustration

- **Mascot:** A friendly, flat-vector style Koala character used throughout the site (Hero, Test types, Features).
- **Style:** Flat vector, utilizing the brand's core colors (gray, mint green, dark navy, soft purple).
- **UI Mockups:** Clean, stylized representations of the actual product dashboard, often layered with slight rotation and shadows to create depth.
