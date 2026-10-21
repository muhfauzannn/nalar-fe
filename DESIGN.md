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

### Visual language

- **Mascot:** A friendly navy-and-white cat represents Bernalar. Depending on
  the scene, the mascot teaches with an AI companion, solves a password puzzle,
  investigates an empty box, studies with a laptop, or sleeps.
- **Style:** Soft 3D/vector illustration with rounded forms, subtle gradients,
  and the brand's dark navy, mint, lavender, and white palette. Use these assets
  as the primary illustration family; do not mix them with unrelated mascot,
  photographic, outline-icon, or flat-cartoon styles in the same composition.
- **Tone:** Curious, calm, capable, and encouraging. Match the emotional state
  of the artwork to the message: an empty box for no content, the sleeping cat
  for an unavailable route, and the plane for forward movement or completion.
- **Source:** All approved assets live in `public/illustration/` and are
  referenced in UI code with root-relative URLs such as
  `/illustration/hero.svg`.

### Asset dimensions and aspect ratios

SVGs are resolution-independent. The dimensions below are the declared canvas
size and should be used to reserve layout space and prevent layout shift. Every
asset has a transparent outer canvas.

| Asset | Canvas | Aspect ratio | Visual content | Best suited for |
| --- | ---: | ---: | --- | --- |
| `auth.svg` | 1254 × 1254 | 1:1 | Cat assembling a password and lock from puzzle pieces | Login, registration, password, account-security, and authentication onboarding panels. This is the approved artwork for the shared auth shell. |
| `chalkboard.svg` | 1254 × 1254 | 1:1 | Empty navy board in mint frame, shown in perspective | Lesson, quiz, mathematics, explainer, or study-feature sections. Treat it as an illustration; do not place essential readable content on the angled board surface. |
| `decoration1.svg` | 1402 × 1122 | 701:561 (≈1.25:1) | Layered navy, mint, and lavender organic blob | Broad section backdrops, feature-callout backgrounds, or a quiet decorative layer behind one focal object. Best when the composition needs depth without motion lines. |
| `decoration2.svg` | 1402 × 1122 | 701:561 (≈1.25:1) | Layered organic blob with an orbiting line | AI workflow, progress, connected-learning, or data-feature callouts. Keep the full canvas visible so the orbit line and satellite shapes are not clipped. |
| `decoration3.svg` | 1402 × 1122 | 701:561 (≈1.25:1) | Compact navy and lavender blob with mint paths and dots | Smaller feature banners, metric callouts, or a restrained background accent where `decoration1.svg` or `decoration2.svg` feels too busy. |
| `empty.svg` | 1254 × 1254 | 1:1 | Curious cat looking into an open lavender box | Empty course, assignment, submission, notification, search-result, and filtered-list states. Pair it with a direct explanation and one recovery action when available. This is the default shared `Empty` component artwork. |
| `hero.svg` | 1254 × 1254 | 1:1 | Cat teacher, mathematics board, and friendly AI robot | Landing-page hero, AI-guided-learning introduction, or a major product overview. Use only once per page and give it generous space; it is the primary brand narrative illustration. |
| `logo-dark.svg` | 900 × 300 | 3:1 | White Bernalar wordmark with the laptop cat replacing the central letter | Dark navy, black, photographic, or otherwise high-contrast dark surfaces, especially the footer. The name refers to its intended dark background, not the logo color. |
| `logo.svg` | 900 × 300 | 3:1 | Navy Bernalar wordmark with the laptop cat replacing the central letter | Light and soft-tinted surfaces, especially the navbar and light cards. This is the default brand lockup. |
| `plane.svg` | 1254 × 1254 | 1:1 | White passenger plane with navy, mint, and lavender accents | Course kickoff, learning journey, goal progress, successful submission, completion, or celebratory next-step states. Avoid using it for errors or static empty states. |
| `sleeping.svg` | 1254 × 1254 | 1:1 | Peacefully sleeping Bernalar cat | 404, unavailable, paused, maintenance, or gentle offline states. It is the approved 404 artwork; do not use it for success or active-learning prompts because its mood suggests inactivity. |

### Placement and sizing rules

- Render these SVGs with `<img>` unless the artwork itself needs to be an
  accessible interactive control, which it normally should not. Include numeric
  `width` and `height` attributes at the asset's ratio, then control its rendered
  size responsively with CSS.
- Use `object-contain` and preserve the complete canvas. Do not use
  `object-cover`, crop a mascot's body, clip the plane's wings, or trim the orbit
  line on `decoration2.svg`.
- Keep square narrative illustrations (`auth`, `empty`, `hero`, `plane`, and
  `sleeping`) around `240–560px` wide on desktop and `180–320px` on mobile.
  The hero may extend to roughly half of a two-column container, but it must not
  overpower the H1 and primary CTA.
- Keep the logos at their 3:1 ratio. Use approximately `120–180px` width in
  navigation and `140–200px` in the footer; never stretch, recolor, rotate, add
  a shadow, or separate the mascot from the wordmark.
- Decorations are supporting layers, not standalone content. Position them
  behind a feature object or short callout, keep them below text in stacking
  order, and reduce their visual dominance rather than adding extra effects.
  Do not tile them or show more than one decoration variant in a single local
  composition.
- Avoid placing long copy directly over any illustration. If short text must sit
  over a decoration's navy center, keep it as live HTML, use a high-contrast
  semantic foreground color, and verify contrast at every responsive size.
- Preserve breathing room around the transparent canvas. Avoid placing another
  detailed illustration immediately beside one of these assets; use whitespace,
  a flat semantic surface, or a simple card as the surrounding field.

### Responsive composition

- In desktop split layouts, keep narrative copy and its CTA in one column and
  the illustration in the other. Alternate the visual side only across separate
  feature sections, not within the same interaction flow.
- On narrow screens, stack copy before the illustration for marketing and
  feature sections. For empty, 404, and auth states, the illustration may appear
  first when it helps establish context, but the heading and recovery action
  must remain visible without excessive scrolling.
- Do not communicate status through the illustration alone. Always pair state
  artwork with a clear heading and supporting copy; add a suitable action for
  recoverable states.

### Accessibility

- Use descriptive `alt` text only when the illustration contributes meaning,
  for example `alt="Kucing Bernalar menyusun teka-teki kata sandi"` on the auth
  panel. Keep it concise and localize it with the surrounding UI.
- When nearby text already communicates the same meaning, use `alt=""`. For
  the three decoration assets, always use `alt=""` and `aria-hidden="true"`
  because they are purely ornamental.
- The wordmark's alt text is simply `Bernalar`; do not describe the embedded cat
  or repeat words such as "logo". When the logo is inside a home link, give the
  link an accessible name only once.
- Never place essential instructions, formulas, status, or data inside an image.
  The blank chalkboard and dark decoration centers are visual surfaces, not a
  replacement for semantic HTML.

### Motion

- Restrict motion to gentle entrance, float, or travel cues on large narrative
  illustrations. Keep amplitude small and avoid animating individual SVG paths.
- `plane.svg` may move once along a short directional path for a completion or
  journey transition. The cat state illustrations should settle quickly and
  should not loop in empty, error, or auth screens.
- Logos must remain static. Decorative blobs may use a very slow, subtle drift
  only in spacious marketing sections.
- All illustration motion must be disabled or reduced through the project's
  `prefers-reduced-motion`/GSAP handling.

## 6. Motion

Motion explains and confirms; it never decorates something people see all day.
Tokens and utilities live in `app/app.css` ("Motion system"); do not hard-code curves.

### Does it move at all? Decide by how often it is seen

| Frequency | Examples | Treatment |
| --- | --- | --- |
| Constantly | buttons, tabs, keyboard actions, list navigation | feedback only: press `scale(0.97)`, colour changes. Never a travelling animation. |
| Now and then | dialogs, an error appearing, a new list row, a reorder | short enter (<= 260ms); exits faster than enters |
| Once | onboarding, celebrations | may be playful |

### Rules

- Only `transform`, `opacity` and `filter` animate. Never `transition-all`; list the
  properties. Tailwind v4 scales with the **`scale` property**, so a press feedback needs
  `scale` in `transition-property` (not `transform`).
- Curves: `--ease-out-strong` (enter/exit, anything that must feel instant),
  `--ease-in-out-strong` (on-screen movement), `--ease-drawer` (sheets). Never `ease-in` on UI.
- Nothing grows from nothing: enters start at `scale(0.96)` / `translateY(6px)` plus opacity;
  a hint of blur (<= 2px) hides the seam when two states cross-fade.
- Modals scale from the centre; anchored popovers use their trigger as origin.
- Lists that change order slide with FLIP (`useFlip`) after an optimistic update, so the UI
  responds before the server does. A row's enter class is dropped when it finishes
  (`ListItem`), because React moving a node would otherwise replay it.
- A button that waits uses `<Button loading={...}>`: label and spinner share one cell, so the
  button never changes width, and double clicks are ignored.
- Switching tabs is local state, not a router navigation (a navigation re-runs loaders and
  flashes the page skeleton).
- `prefers-reduced-motion`: keep the fade, drop travel, scale and blur (global layer in
  `app.css`; JS animation checks `matchMedia`). Hover styles are already gated behind
  `@media (hover: hover)` by Tailwind.
- Touch targets: icon buttons grow an invisible hit area (`after:-inset-1.5`) instead of looking bigger.
- The navbar is seen on every page, so it gets feedback only: no intro animation, links press to
  `scale(0.97)`, and the bar's blurred surface is a single layer whose `opacity` fades in once the
  page scrolls past 8px (an `IntersectionObserver` sentinel, not a scroll listener). The centre links
  sit in a three-column grid so they can never run into the right-hand cluster. Only the mobile
  drawer (`--ease-drawer`, 300ms in / 200ms out) and the account popover (origin-aware, <= 200ms)
  animate their open/close.

### How this was verified

The measurements are executable, not eyeballed: computed `scale` while pressed, button width
before/during a save, DOM order before the server answers, the easing/duration of the
animations the browser actually created (`getAnimations()`; for CSS animations the easing is
on the keyframes), idle infinite animations, reduced-motion behaviour and the CSSOM media
wrapping of `:hover`.
