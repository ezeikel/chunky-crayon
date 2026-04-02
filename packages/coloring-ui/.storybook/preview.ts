import type { Preview } from "@storybook/react-vite";
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
      document.documentElement.setAttribute("data-theme", theme);
      return Story();
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
