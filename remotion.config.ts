import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");

// Use the Chromium headless shell already preinstalled in this environment
// (it trusts the outbound proxy's CA) instead of Remotion downloading its
// own copy, which does not.
Config.setBrowserExecutable(
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"
);
