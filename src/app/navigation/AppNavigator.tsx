import React, { useState } from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { ROUTES } from '../constants/routes';

/**
 * Simple state-based navigator. Replace with @react-navigation/native
 * when you add the dependency (e.g. Stack + Bottom Tabs).
 */
export function AppNavigator() {
  const [currentRoute, setCurrentRoute] = useState(ROUTES.HOME);

  const handleNavigate = (route: string) => setCurrentRoute(route);

  switch (currentRoute) {
    case ROUTES.ANALYSIS:
      return <AnalysisScreen onNavigate={handleNavigate} />;
    case ROUTES.HOME:
    default:
      return <HomeScreen onNavigate={handleNavigate} />;
  }
}
