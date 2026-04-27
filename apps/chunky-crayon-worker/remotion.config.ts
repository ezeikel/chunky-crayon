import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Webpack override: workspace packages emit ESM dist with extensionless
// relative imports (TypeScript "moduleResolution: bundler"). Webpack 5 in
// strict ESM mode rejects these. fullySpecified=false lets webpack fall
// back to file-extension resolution for all node_modules JS — matching
// what Next.js does for the same workspace packages.
Config.overrideWebpackConfig((current) => {
  return {
    ...current,
    module: {
      ...current.module,
      rules: [
        ...(current.module?.rules ?? []),
        {
          test: /\.m?js$/,
          resolve: { fullySpecified: false },
        },
      ],
    },
  };
});
