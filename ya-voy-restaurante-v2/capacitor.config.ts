import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'mx.batallagroup.yavoy.restaurante',
  appName: 'Ya Voy Restaurante',
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
