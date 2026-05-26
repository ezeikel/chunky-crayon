/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from "react-native";

import { Colors } from "@/constants/Colors";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  // RN's ColorSchemeName widened to include 'unspecified' | null; narrow
  // to the two we actually care about so `Colors[theme]` typechecks.
  const scheme = useColorScheme();
  const theme: "light" | "dark" = scheme === "dark" ? "dark" : "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
