// Capacitor config for the Android build. Install: bun add @capacitor/core @capacitor/cli @capacitor/android
// See README "Android (APK)" for the native playback service that is still required.
const config = {
  appId: "com.gfgamedev.neonplayer",
  appName: "Neon Player",
  webDir: ".output/public",
  android: { backgroundColor: "#0f0f14" },
};

export default config;