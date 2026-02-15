import { useState } from "react";
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { register } from "../data/auth";
import { colors, spacing } from "../theme";

type Props = {
	onSuccess: () => void;
	onGoToLogin: () => void;
};

export function RegisterScreen({ onSuccess, onGoToLogin }: Props) {
	const [name, setName] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleRegister = async () => {
		setError("");
		if (password !== confirm) {
			setError("Passwords do not match");
			return;
		}
		setLoading(true);
		const result = await register({ username, password, name });
		if (result.error) {
			setLoading(false);
			setError(result.error);
			return;
		}
		setLoading(false);
		onSuccess();
	};

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={styles.title}>Create account</Text>
				<Text style={styles.subtitle}>Your data stays on this device</Text>

				{error ? <Text style={styles.error}>{error}</Text> : null}

				<TextInput
					style={styles.input}
					placeholder="Name"
					placeholderTextColor={colors.slate400}
					autoCapitalize="words"
					value={name}
					onChangeText={(t) => {
						setName(t);
						setError("");
					}}
				/>
				<TextInput
					style={styles.input}
					placeholder="Username (unique)"
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
					placeholder="Password (min 4 characters)"
					placeholderTextColor={colors.slate400}
					secureTextEntry
					value={password}
					onChangeText={(t) => {
						setPassword(t);
						setError("");
					}}
				/>
				<TextInput
					style={styles.input}
					placeholder="Confirm password"
					placeholderTextColor={colors.slate400}
					secureTextEntry
					value={confirm}
					onChangeText={(t) => {
						setConfirm(t);
						setError("");
					}}
				/>

				<Pressable
					onPress={handleRegister}
					style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
					disabled={loading}
				>
					<Text style={styles.primaryBtnLabel}>
						{loading ? "Creating…" : "Sign up"}
					</Text>
				</Pressable>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Already have an account? </Text>
					<Pressable onPress={onGoToLogin} hitSlop={8}>
						<Text style={styles.link}>Log in</Text>
					</Pressable>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	scroll: { flex: 1 },
	container: {
		paddingHorizontal: spacing.xl,
		paddingTop: 32,
		paddingBottom: 48,
		maxWidth: 400,
		alignSelf: "center",
		width: "100%",
	},
	title: { fontSize: 28, fontWeight: "700", color: colors.slate800 },
	subtitle: {
		fontSize: 16,
		color: colors.slate500,
		marginTop: 8,
		marginBottom: 24,
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
		marginTop: spacing.sm,
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
