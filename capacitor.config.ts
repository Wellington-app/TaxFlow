import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taxflow.planejamento',
  appName: 'TaxFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
