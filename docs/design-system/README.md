# Design System

Two brands share one component package (`@one-colored-pixel/coloring-ui`) but
diverge visually via CSS custom properties. **Components are identical; tokens
are what make CC feel playful and CH feel calm.**

| Brand                                     | Audience          | Vibe                    |
| ----------------------------------------- | ----------------- | ----------------------- |
| [Chunky Crayon](./chunky-crayon.md)       | Kids 3–12         | Playful, chunky, bouncy |
| [Coloring Habitat](./coloring-habitat.md) | Adults (wellness) | Clean, airy, calm       |

## How to use this

- **Designing new UI for CC or CH**: open the relevant brand doc. Use the
  tokens; don't hand-code radii/weights/shadows.
- **Adding a shared component to `packages/coloring-ui`**: never hardcode
  `rounded-full`, `font-bold`, `shadow-lg`, `text-gray-400` — use
  `rounded-coloring-button`, `font-coloring-heading`, `shadow-coloring-*`,
  `text-coloring-muted`. Every visual property has a brand-aware token.
- **Deciding when to branch by brand in JSX**: almost never. Use tokens for
  visuals. Only branch on `variant` from `useColoringContext()` when the
  _structure_ differs — e.g. kids get a reduced tool set, adults get skin-tone
  swatches and recent colors. Mascot lives in app, not package.

## Token namespace

All brand tokens share the `coloring-` prefix so they don't collide with app
tokens. Both apps declare them once in their globals:

- `apps/chunky-crayon-web/global.css` — CC values
- `apps/coloring-habitat-web/app/globals.css` — CH values

Tailwind v4 picks them up via `@theme` and emits the utilities
(`bg-coloring-accent`, `rounded-coloring-button`, etc.).

## Storybook

`cd packages/coloring-ui && pnpm storybook` — both brands side-by-side, theme
switcher in the toolbar. Every component has at least a default story; key
components have a `BothBrands` story.

## When the two brands intentionally diverge

| Aspect            | CC                          | CH                    |
| ----------------- | --------------------------- | --------------------- |
| Feature set       | Reduced tool subset         | Full tool set         |
| Mascot (Colo)     | Yes                         | No                    |
| Stickers          | Yes                         | No                    |
| Skin-tone palette | No (always-on basic colors) | Yes (toggleable)      |
| Recent colors     | No                          | Yes (localStorage)    |
| Pattern fills     | No                          | Yes (dots, stars, …)  |
| Sound default     | On                          | Off                   |
| Ambient music     | Optional                    | On by default, 20–30% |

If a feature doesn't appear here, it should work the same in both brands —
missing CH parity is a bug, not a design choice.
