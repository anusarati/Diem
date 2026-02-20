import { useState } from "react";
import { View } from "react-native";
import { BottomNav } from "../components/BottomNav";
import { ROUTES } from "../constants/routes";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import type { AppRoute } from "../types";

type Props = {
	onLogout: () => void;
};

export function AppNavigator({ onLogout }: Props) {
	const [currentRoute, setCurrentRoute] = useState<AppRoute>(ROUTES.HOME);

	const handleNavigate = (route: AppRoute) => setCurrentRoute(route);

	const showBottomNav = true;

	return (
		<View style={{ flex: 1 }}>
			{currentRoute === ROUTES.ANALYSIS && (
				<AnalysisScreen onNavigate={handleNavigate} />
			)}
			{currentRoute === ROUTES.HOME && (
				<HomeScreen onNavigate={handleNavigate} />
			)}
			{currentRoute === ROUTES.PROFILE && <ProfileScreen onLogout={onLogout} />}
			{currentRoute === ROUTES.CALENDAR && (
				<ScheduleScreen onNavigate={handleNavigate} />
			)}
			{showBottomNav && (
				<BottomNav currentRoute={currentRoute} onNavigate={handleNavigate} />
			)}
		</View>
	);
}
