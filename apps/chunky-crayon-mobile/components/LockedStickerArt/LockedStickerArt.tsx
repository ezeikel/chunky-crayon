import { useState } from "react";
import {
  View,
  StyleSheet,
  Image as RNImage,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Image as SkiaImage,
  ColorMatrix,
  Blur,
  useImage,
} from "@shopify/react-native-skia";

/**
 * A locked sticker rendered as a TRUE grayscale ghost — web parity with the
 * web StickerCard / StickerDetailModal locked treatment (CSS
 * `grayscale opacity-30 blur-[0.5px]`).
 *
 * Single source of truth for the locked look, used by BOTH the sticker grid
 * (app/(tabs)/stickers.tsx) and the detail sheet (StickerDetailSheet) so they
 * can never drift apart again.
 *
 * Why Skia: expo-image has no grayscale filter, and a flat `tintColor`
 * collapses every pixel to one colour (the old "featureless blob"). A Skia
 * ColorMatrix luminance matrix strips the hue while preserving the tonal range
 * (dark outline stays dark, fills go light grey), so the crown/cape/medallion
 * stay legible.
 *
 * Sizing:
 *   - pass `size` for a fixed square (e.g. the detail sheet's 104px art), or
 *   - omit it and the component fills its parent (flex:1), measuring itself via
 *     onLayout — the Skia <Image> needs concrete numeric w/h, it can't size by
 *     flex/%. Either way the Canvas only mounts once we have a non-zero size,
 *     which also sidesteps the 0-dim-canvas crash class.
 *
 * Loaded via useImage(resolveAssetSource(uri)) — `useImage(<require number>)`
 * is unreliable for Skia (see ImageCanvas.tsx L259-262); resolveAssetSource
 * gives the Metro http URI in dev + the asset:// URI in release. Until the
 * image decodes (or before first layout) we render a blank sized View — never
 * the colour art, so there is no flash.
 */

// Rec.601 luminance grayscale matrix. Each output RGB channel = weighted
// luminance of the input; alpha (last row) passes through so transparent PNG
// corners stay transparent.
const GRAYSCALE_MATRIX = [
  0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152,
  0.0722, 0, 0, 0, 0, 0, 1, 0,
];

type Props = {
  source: ImageSourcePropType;
  /** Fixed square size in px. Omit to fill the parent (flex:1) + self-measure. */
  size?: number;
  /** Style for the wrapper (e.g. fill rules when self-measuring). */
  style?: StyleProp<ViewStyle>;
  /** Canvas alpha — web uses opacity-30; grayscale reads a touch stronger so
   *  we default a little higher. */
  opacity?: number;
};

const LockedStickerArt = ({ source, size, style, opacity = 0.4 }: Props) => {
  const [measured, setMeasured] = useState(0);
  const uri = RNImage.resolveAssetSource(source)?.uri ?? null;
  const img = useImage(uri);

  const px = size ?? measured;

  const onLayout = (e: LayoutChangeEvent) => {
    if (size) return; // fixed size — no need to measure
    const { width, height } = e.nativeEvent.layout;
    const next = Math.floor(Math.min(width, height));
    if (next > 0 && next !== measured) setMeasured(next);
  };

  return (
    <View
      style={[size ? { width: size, height: size } : styles.fill, style]}
      onLayout={onLayout}
    >
      {img && px > 0 ? (
        <Canvas style={{ width: px, height: px, opacity }}>
          <SkiaImage
            image={img}
            x={0}
            y={0}
            width={px}
            height={px}
            fit="contain"
          >
            <ColorMatrix matrix={GRAYSCALE_MATRIX} />
            <Blur blur={0.6} />
          </SkiaImage>
        </Canvas>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LockedStickerArt;
