import { useState } from "react";
import { Text, View } from "react-native";
import { BottomNav } from "../components/BottomNav";
import { ROUTES } from "../constants/routes";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme";
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
				<View
					style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
				>
					<Text style={{ fontSize: 16, color: colors.slate500 }}>
						Coming soon
					</Text>
				</View>
			)}
			{showBottomNav && (
				<BottomNav currentRoute={currentRoute} onNavigate={handleNavigate} />
			)}
		</View>
	);
}
