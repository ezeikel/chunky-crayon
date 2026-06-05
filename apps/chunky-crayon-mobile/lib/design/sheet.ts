import { ViewStyle } from "react-native";
import { COLORS } from "./colors";

/**
 * THE canonical bottom-sheet grab handle. Every sheet in the app (the coloring
 * drawer, Colo, Action, Confirm, ProfileSwitcher, Create) renders this exact
 * pill so the sheet language is consistent — matching the coloring drawer, which
 * is the reference (web: w-14 h-[5px] rounded-full bg-coloring-surface-dark/80 +
 * a soft shadow for definition).
 *
 * Spread it into the sheet's handle View style; set the per-sheet gap to the
 * content separately (handles sit at different distances from their content).
 */
export const SHEET_HANDLE: ViewStyle = {
  alignSelf: "center",
  width: 56,
  height: 5,
  borderRadius: 2.5,
  backgroundColor: COLORS.bgCreamDark,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
};

/**
 * Top padding for a sheet's surface so the handle sits a consistent distance
 * from the top edge across all sheets (matches the coloring drawer).
 */
export const SHEET_SURFACE_PADDING_TOP = 16;
