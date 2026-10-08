import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.batallagroup.yavoy.repartidor',
  appName: 'Ya Voy Repartidor',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};
export default config;
