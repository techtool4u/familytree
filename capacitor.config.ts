import type { CapacitorConfig } from '@capacitor/cli';

// Native Android / iOS apps wrap the normal web build in dist/.
// `appId` is permanent once published to the stores.
const config: CapacitorConfig = {
  appId: 'com.techtool4u.kindred',
  appName: 'Kindred',
  webDir: 'dist',
  backgroundColor: '#f6f5f1',
  ios: { contentInset: 'never' },
};

export default config;
