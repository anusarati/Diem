import { useState } from "react";
import { ROUTES } from "../constants/routes";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

/**
 * Simple state-based navigator. Replace with @react-navigation/native
 * when you add the dependency (e.g. Stack + Bottom Tabs).
 */
export function AppNavigator() {
	const [currentRoute, setCurrentRoute] = useState<string>(ROUTES.HOME);

	const handleNavigate = (route: string) => setCurrentRoute(route);

	switch (currentRoute) {
		case ROUTES.ANALYSIS:
			return <AnalysisScreen onNavigate={handleNavigate} />;
		case ROUTES.SCHEDULE:
			return <ScheduleScreen onNavigate={handleNavigate} />;
		case ROUTES.SETTINGS:
			return <SettingsScreen onNavigate={handleNavigate} />;
		default:
			return <HomeScreen onNavigate={handleNavigate} />;
	}
}
