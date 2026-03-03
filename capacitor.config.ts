import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taxflow.app',
  appName: 'TaxFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
