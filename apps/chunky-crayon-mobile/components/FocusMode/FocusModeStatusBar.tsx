import { StatusBar } from "expo-status-bar";
import { useFocusMode } from "./FocusModeProvider";

/**
 * Status bar binding — flips `hidden` based on focus mode. Drops
 * into any screen that wants the status bar to honor focus mode
 * (typically the coloring-image route).
 *
 * `expo-status-bar`'s `<StatusBar hidden>` declaratively hides the
 * status bar — no manual setHidden calls needed. animation="fade"
 * gives a smoother transition than the default abrupt jump.
 */
const FocusModeStatusBar = () => {
  const { isFocusMode } = useFocusMode();
  return <StatusBar hidden={isFocusMode} animated style="auto" />;
};

export default FocusModeStatusBar;
