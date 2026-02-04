import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { App as DiemApp } from './src/app';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <DiemApp />
    </>
  );
}
