# Design System Strategy: The Fluid Ledger

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Invisible Assistant."**

In the high-friction world of splitting bills and managing debts, the UI must feel like a calming, high-end editorial experience rather than a spreadsheet. We move beyond "Standard Minimal" by embracing a **Soft-Modernist** aesthetic. This means breaking the rigid, boxed-in layouts of traditional fintech. We use intentional asymmetry, generous whitespace (the "Air" principle), and overlapping depth to make the app feel tactile and premium.

This system rejects the "template" look. We do not use borders to define containers; we use light and shadow to define existence. The goal is a digital environment that feels as effortless as a conversation between friends.

---

## 2. Colors & Atmospheric Depth
Our palette is anchored in a sophisticated Teal (`primary: #006b5f`) and supported by organic, earthy neutrals.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning or grouping.
Boundaries must be defined solely through background color shifts. A `surface-container-low` (#f1f4f5) section sitting on a `surface` (#f8f9fa) background provides all the separation a modern eye needs. This creates a "seamless" interface that feels like a single, continuous piece of fine paper.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create nested depth:
*   **Base:** `surface` (#f8f9fa)
*   **Secondary Grouping:** `surface-container-low` (#f1f4f5)
*   **Elevated Elements:** `surface-container-lowest` (#ffffff) for cards to provide "pop" against the off-white base.

### The "Glass & Gradient" Rule
To elevate the "Split" action, use **Glassmorphism**. Floating action buttons or navigation bars should use semi-transparent versions of `surface` with a 20px-40px backdrop blur.
*   **Signature Textures:** For main CTA buttons or high-level summary cards, use a subtle linear gradient from `primary` (#006b5f) to `primary-dim` (#005e53) at a 135-degree angle. This adds "soul" and a tactile, curved feel that flat hex codes lack.

---

## 3. Typography: Editorial Authority
We pair the functional clarity of **Inter** with the geometric character of **Manrope** to create a "High-End Magazine" feel.

*   **Display & Headlines (Manrope):** These are the "Hero" moments. Use `display-lg` (3.5rem) for total amounts or debt summaries. The geometric nature of Manrope feels modern and authoritative.
*   **Body & Labels (Inter):** Inter is used for all functional data. Its high x-height ensures readability even at `body-sm` (0.75rem) when viewing complex transaction histories.
*   **Intentional Contrast:** Always pair a `headline-md` title with a `body-md` description using a significant color contrast (e.g., `on-surface` vs `on-surface-variant`) to guide the eye immediately to the most important information.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are a crutch. This system uses **Tonal Layering** to convey importance.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural lift.
*   **Ambient Shadows:** If an element must "float" (like a modal or a primary action button), use a shadow with a blur of `32px` at `4%` opacity. The shadow color should not be black; use a tinted version of `on-surface` (#2d3335) to mimic natural light.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., in high-glare environments), use the `outline-variant` (#adb3b5) at **15% opacity**. 100% opaque borders are strictly forbidden.
*   **Interactive Depth:** On press, an element should transition from `surface-container-lowest` to `surface-dim`, creating a "pressed-in" physical sensation.

---

## 5. Components & Interaction Patterns

### Buttons (The Soft-Touch)
*   **Primary:** Uses the `primary` color with a `lg` (1rem) corner radius. These are wide, pill-like shapes that feel friendly to the thumb.
*   **Secondary/Tertiary:** No background. Use `title-sm` typography in the `primary` color.
*   **States:** On hover/active, shift the background to `primary-dim`.

### Swipe Interaction Cues (The Interaction Signature)
Since this is a bill-splitting app, "Yes/No" or "Settle/Remind" actions are driven by swipes.
*   **Right Swipe (Approve/Settle):** Reveal a `secondary` (#1c6d25) background with an icon.
*   **Left Swipe (Reject/Decline):** Reveal a `tertiary` (#ba1e21) background.
*   *Note:* Use a 15% opacity tint of these colors for the track, but 100% for the icon to maintain the "airy" feel.

### Input Fields
*   **Design:** No bottom line, no box. Use a `surface-container-highest` background with a `md` (0.75rem) corner radius.
*   **Typography:** The input text should be `title-lg` for monetary values to ensure clarity.

### Cards & Lists (The Divider-Free Rule)
*   **Lists:** Forbid divider lines. Use `spacing-4` (1.4rem) between list items. The whitespace is your divider.
*   **Cards:** Use `surface-container-lowest` with an `xl` (1.5rem) corner radius to hold transaction details.

### Currency Displays
Special component: The "Dynamic Total." Use `display-md` (Manrope) for the whole number and `headline-sm` for the decimals, aligned to the top (superscript style) to create a sophisticated, editorial look for money.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing-10` or `spacing-12` for top-level page margins to create a "Gallery" feel.
*   **Do** use asymmetric layouts (e.g., a headline aligned left with a CTA button offset to the right) to break the "Bootstrap" look.
*   **Do** leverage `primary-container` for non-urgent success states to keep the UI "friendly" rather than "alarming."

### Don't
*   **Don't** use 1px dividers between list items. Use vertical space.
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#2d3335) to maintain the soft-minimalist aesthetic.
*   **Don't** use `DEFAULT` rounding (0.5rem) for large cards; scale up to `xl` (1.5rem) to emphasize the "softness" of the system.
*   **Don't** crowd the screen. If you can't fit it with `spacing-4` between elements, move it to a sub-page or a progressive disclosure (accordion).
