// Register the local "flood-fill" Nitro module with React Native autolinking so
// its podspec (iOS) and Gradle project (Android) are picked up on every Expo
// prebuild. RN autolinking normally scans node_modules; this explicit entry
// makes it find the in-repo module under ./modules/flood-fill.
module.exports = {
  dependencies: {
    "flood-fill": {
      root: __dirname + "/modules/flood-fill",
      platforms: {
        ios: {
          podspecPath: __dirname + "/modules/flood-fill/FloodFill.podspec",
        },
        android: {
          sourceDir: __dirname + "/modules/flood-fill/android",
        },
      },
    },
  },
};
