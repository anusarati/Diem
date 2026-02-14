import { useState } from "react";
import { ROUTES } from "../constants/routes";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { HomeScreen } from "../screens/HomeScreen";
import type { AppRoute } from "../types";

/**
 * Simple state-based navigator. Replace with @react-navigation/native
 * when you add the dependency (e.g. Stack + Bottom Tabs).
 */
export function AppNavigator() {
	const [currentRoute, setCurrentRoute] = useState<AppRoute>(ROUTES.HOME);

	const handleNavigate = (route: AppRoute) => setCurrentRoute(route);

	if (currentRoute === ROUTES.ANALYSIS) {
		return <AnalysisScreen onNavigate={handleNavigate} />;
	}
	return <HomeScreen onNavigate={handleNavigate} />;
}
