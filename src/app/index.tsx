import React from 'react';
import { AppNavigator } from './navigation/AppNavigator';

/**
 * App entry for React Native.
 * Use this as the root component in your App.tsx or index.js:
 *
 *   import { App } from './src/app';
 *   export default function Main() { return <App />; }
 */
export function App() {
  return <AppNavigator />;
}
