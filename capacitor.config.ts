import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'mx.yavoy.restaurante',
  appName: 'Ya Voy Restaurante',
  webDir:  'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
