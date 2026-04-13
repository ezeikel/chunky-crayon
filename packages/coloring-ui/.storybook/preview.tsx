import type { Preview } from "@storybook/react-vite";
import React from "react";
import { ColoringContextProvider } from "../src/context";
import "./themes.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Brand theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "chunky-crayon", title: "Chunky Crayon (Kids)" },
          { value: "coloring-habitat", title: "Coloring Habitat (Adults)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "chunky-crayon",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "chunky-crayon";
      const variant = theme === "chunky-crayon" ? "kids" : "adult";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
      }
      return (
        <ColoringContextProvider variant={variant} storagePrefix="storybook">
          <Story />
        </ColoringContextProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
