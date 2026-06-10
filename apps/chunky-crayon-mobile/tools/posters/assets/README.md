# Bezel assets

Device-frame bezel PNGs go here. The generator composites each captured
screenshot inside a bezel's transparent screen cutout.

## Expected files

| File                      | Device key   | Store res used |
| ------------------------- | ------------ | -------------- |
| `ipad-13-portrait.png`    | `ipad-13`    | 2048 x 2732    |
| `iphone-6.9-portrait.png` | `iphone-6.9` | 1290 x 2796    |

These filenames are wired in `src/devices.ts` (`bezelPng`). A bezel PNG must
have a **transparent screen cutout** (the screenshot shows through it) and an
opaque device body.

## Sourcing — LICENSE-SAFE only (from the research brief `bezelAssets`)

A poster tool that ships in the repo **cannot bundle Apple's Design Resources
bezels** — Apple's license bars embedding in software, redistribution,
separating components from the bundle, and modification. The Apple
marketing-guideline permission to use product bezels is for your own finished
marketing used as-is, not for bundling in a tool. So do NOT drop Apple-sourced
bezels here.

Two safe options:

1. **PommePlate (CC0 1.0, no attribution).** Empty-screen iPhone + iPad PNG
   mockups. Archived 2023 — no Dynamic Island, no current iPad Pro — but CC0, so
   it is safe to place here. Pull it with:

   ```bash
   bash scripts/fetch-bezels.sh
   ```

2. **devices.css (MIT, pure CSS, no images).** This is the reference for the
   tool's **CSS-frame fallback** (the cutout equals the frame padding). No PNG
   is produced; the fallback is already implemented in `src/template.ts`.

If no license-safe PNG is available, that is fine: with this folder empty the
generator automatically renders the high-quality **CSS device frame**
(`src/template.ts`), so `posters gen` works end to end. The PNG path is a visual
upgrade, not a requirement.

## Measuring the inset (PNG path only)

The screen-cutout inset is the **alpha bounding box**, measured once per device
with ImageMagick:

```bash
bash scripts/measure-bezel-inset.sh assets/ipad-13-portrait.png
bash scripts/measure-bezel-inset.sh assets/iphone-6.9-portrait.png
```

Paste the printed fractions into the matching device's `screenInset` in
`src/devices.ts`. Until measured, `devices.ts` ships a derived inset that is
close enough for PommePlate-class straight bezels.

> Reference native resolutions (brief): iPad Pro 13" M4 = 2064 x 2752; iPhone 16
> Pro = 1206 x 2622. The store-output canvas dims live in `src/devices.ts`
> (`store`).

This `README.md` also keeps the otherwise-empty `assets/` directory tracked in
git.
