import { useState } from "react";
import {
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { login } from "../data/auth";
import { colors, spacing } from "../theme";

type Props = {
	onSuccess: () => void;
	onGoToRegister: () => void;
};

export function LoginScreen({ onSuccess, onGoToRegister }: Props) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setError("");
		setLoading(true);
		const result = await login(username, password);
		setLoading(false);
		if (result.error) {
			setError(result.error);
			return;
		}
		onSuccess();
	};

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Log in</Text>
				<Text style={styles.subtitle}>Welcome back</Text>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				<TextInput
					style={styles.input}
					placeholder="Username"
					placeholderTextColor={colors.slate400}
					autoCapitalize="none"
					autoCorrect={false}
					value={username}
					onChangeText={(t) => {
						setUsername(t);
						setError("");
					}}
				/>
				<TextInput
					style={styles.input}
					placeholder="Password"
					placeholderTextColor={colors.slate400}
					secureTextEntry
					value={password}
					onChangeText={(t) => {
						setPassword(t);
						setError("");
					}}
				/>

				<Pressable
					onPress={handleLogin}
					style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
					disabled={loading}
				>
					<Text style={styles.primaryBtnLabel}>
						{loading ? "Logging in…" : "Log in"}
					</Text>
				</Pressable>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Don't have an account? </Text>
					<Pressable onPress={onGoToRegister} hitSlop={8}>
						<Text style={styles.link}>Sign up</Text>
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	container: {
		flex: 1,
		paddingHorizontal: spacing.xl,
		paddingTop: 48,
		maxWidth: 400,
		alignSelf: "center",
		width: "100%",
	},
	title: { fontSize: 28, fontWeight: "700", color: colors.slate800 },
	subtitle: {
		fontSize: 16,
		color: colors.slate500,
		marginTop: 8,
		marginBottom: 32,
	},
	error: {
		fontSize: 14,
		color: colors.red400,
		marginBottom: spacing.md,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 16,
		color: colors.slate800,
		marginBottom: spacing.md,
		backgroundColor: colors.white,
	},
	primaryBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
		marginTop: spacing.md,
	},
	primaryBtnDisabled: { opacity: 0.7 },
	primaryBtnLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: spacing.xxl,
	},
	footerText: { fontSize: 14, color: colors.slate500 },
	link: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
