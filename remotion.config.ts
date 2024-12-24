// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";
import path from "path";

Config.overrideWebpackConfig(async (config) => {
  return enableTailwind({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        "@": path.join(process.cwd(), "src"),
      },
    },
  });
});

Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setBeepOnFinish(true);
Config.setScale(2);
Config.setConcurrency(1);
Config.setChromiumOpenGlRenderer("angle");
