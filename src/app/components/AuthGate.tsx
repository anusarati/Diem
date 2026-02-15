import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { getCurrentUser } from "../data/auth";
import type { CurrentUser } from "../data/auth";
import { AppNavigator } from "../navigation/AppNavigator";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";

type AuthScreen = "login" | "register";

export function AuthGate() {
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [authScreen, setAuthScreen] = useState<AuthScreen>("login");

	const refreshUser = useCallback(() => {
		getCurrentUser().then((u) => {
			setUser(u);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		refreshUser();
	}, [refreshUser]);

	const handleLoginSuccess = useCallback(() => {
		refreshUser();
	}, [refreshUser]);

	const handleLogout = useCallback(async () => {
		const { logout } = await import("../data/auth");
		await logout();
		setUser(null);
	}, []);

	if (loading) {
		return (
			<View style={styles.loading}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	if (!user) {
		if (authScreen === "register") {
			return (
				<RegisterScreen
					onSuccess={handleLoginSuccess}
					onGoToLogin={() => setAuthScreen("login")}
				/>
			);
		}
		return (
			<LoginScreen
				onSuccess={handleLoginSuccess}
				onGoToRegister={() => setAuthScreen("register")}
			/>
		);
	}

	return <AppNavigator onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.backgroundLight,
	},
});
