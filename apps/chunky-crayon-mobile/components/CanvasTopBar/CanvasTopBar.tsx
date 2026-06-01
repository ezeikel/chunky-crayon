import { View, Pressable, StyleSheet } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faStar,
  faVolumeHigh,
  faVolumeXmark,
  faMusic,
  faMusicSlash,
} from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useCanvasStore } from "@/stores/canvasStore";
import { tapLight } from "@/utils/haptics";
import { COLORS, CRAYON } from "@/lib/design";

/**
 * The bar that sits ABOVE the canvas in the tablet coloring layout —
 * a direct port of CC web's row (ProgressIndicator + MuteToggle):
 *
 *   [ ====== progress bar ====== ★ ]   [🔊]  [🎵]
 *
 * - Progress bar: a full-width pill (h-6 / 24px, rounded-full) with a cream
 *   track (#FAF7F0, inset shadow), an orange (#E46444) fill that turns green
 *   (crayon-green) at 100%, and a 36px star knob pinned to the right end
 *   (cream bg + muted-orange star; yellow bg + white star when complete).
 * - Sound-effects + music toggles: 48px round tiles, ORANGE bg + WHITE icon
 *   when on (web's `bg-coloring-accent text-white`); white bg + cream border
 *   + muted icon when off. Two independent flags (isSfxMuted / isAmbientMuted).
 *
 * Matches web's MuteToggle/ProgressIndicator visuals byte-for-byte on the
 * tokens (orange #E46444, cream #FAF7F0, green #8CAF5A).
 */

const BAR_HEIGHT = 24;
const KNOB = 36;
const TILE = 48;

type AudioTileProps = {
  on: boolean;
  onToggle: () => void;
  iconOn: IconDefinition;
  iconOff: IconDefinition;
  label: string;
};

const AudioTile = ({
  on,
  onToggle,
  iconOn,
  iconOff,
  label,
}: AudioTileProps) => (
  <Pressable
    onPress={() => {
      tapLight();
      onToggle();
    }}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected: on }}
    style={({ pressed }) => [
      styles.tile,
      on ? styles.tileOn : styles.tileOff,
      pressed && styles.pressed,
    ]}
  >
    <FontAwesomeIcon
      icon={on ? iconOn : iconOff}
      size={20}
      color={on ? COLORS.white : COLORS.textMuted}
    />
  </Pressable>
);

const CanvasTopBar = () => {
  const progress = useCanvasStore((s) => Math.round(s.progress));
  const isSfxMuted = useCanvasStore((s) => s.isSfxMuted);
  const isAmbientMuted = useCanvasStore((s) => s.isAmbientMuted);
  const toggleSfxMuted = useCanvasStore((s) => s.toggleSfxMuted);
  const toggleAmbientMuted = useCanvasStore((s) => s.toggleAmbientMuted);

  const isDone = progress >= 100;
  const fillWidth = `${Math.max(0, Math.min(100, progress))}%` as const;

  return (
    <View style={styles.row}>
      {/* Progress bar pill + star knob (web ProgressIndicator). */}
      <View style={styles.barWrap}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: fillWidth },
              isDone ? styles.fillDone : styles.fillActive,
            ]}
          />
        </View>
        <View style={[styles.knob, isDone ? styles.knobDone : styles.knobIdle]}>
          <FontAwesomeIcon
            icon={faStar}
            size={18}
            color={isDone ? COLORS.white : "rgba(228,100,68,0.4)"}
          />
        </View>
      </View>

      {/* Sound-effects + music toggles (web MuteToggle, two tiles). */}
      <AudioTile
        on={!isSfxMuted}
        onToggle={toggleSfxMuted}
        iconOn={faVolumeHigh}
        iconOff={faVolumeXmark}
        label={isSfxMuted ? "Sound effects off" : "Sound effects on"}
      />
      <AudioTile
        on={!isAmbientMuted}
        onToggle={toggleAmbientMuted}
        iconOn={faMusic}
        iconOff={faMusicSlash}
        label={isAmbientMuted ? "Music off" : "Music on"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  // Bar takes all remaining width; the star knob overlays its right end.
  barWrap: {
    flex: 1,
    minWidth: 0,
    height: KNOB,
    justifyContent: "center",
  },
  // Cream track with a faint inset edge so the EMPTY (0%) bar still reads as
  // a pill on the cream page background (web uses an inset shadow; RN can't
  // do inset box-shadow, so a hairline darker-cream border stands in).
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: COLORS.bgCream,
    borderWidth: 1,
    borderColor: COLORS.bgCreamDark,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: BAR_HEIGHT / 2,
  },
  fillActive: {
    backgroundColor: COLORS.crayonOrange,
  },
  fillDone: {
    backgroundColor: CRAYON.green.base,
  },
  knob: {
    position: "absolute",
    right: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  knobIdle: {
    backgroundColor: COLORS.bgCream,
  },
  knobDone: {
    backgroundColor: COLORS.yellow,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tileOn: {
    backgroundColor: COLORS.crayonOrange,
  },
  tileOff: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.bgCreamDark,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
});

export default CanvasTopBar;
