import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
// The sandboxed environment's outbound HTTPS proxy uses a custom CA that
// Chromium doesn't trust by default; without this, Google Fonts requests
// (loaded via @remotion/google-fonts) fail with ERR_CERT_AUTHORITY_INVALID.
Config.setChromiumIgnoreCertificateErrors(true);
