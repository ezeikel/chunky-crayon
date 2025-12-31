import * as Haptics from "expo-haptics";

/**
 * Haptic feedback utilities for kid-friendly tactile responses
 */

/**
 * Light tap - for color/tool selection
 */
export const tapLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium tap - for brush type selection, undo/redo
 */
export const tapMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy tap - for fill action, stamp placement
 */
export const tapHeavy = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Success feedback - for completing actions
 */
export const notifySuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Warning feedback - for undo limit reached
 */
export const notifyWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Selection changed feedback
 */
export const selectionChanged = () => {
  Haptics.selectionAsync();
};
