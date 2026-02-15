import { Pressable, StyleSheet, Text, View } from "react-native";
import { ROUTES } from "../constants/routes";
import { colors, spacing } from "../theme";
import type { AppRoute } from "../types";

type NavItem = { route: AppRoute; label: string };

const ITEMS: NavItem[] = [
	{ route: ROUTES.HOME, label: "Home" },
	{ route: ROUTES.ANALYSIS, label: "Analytics" },
	{ route: ROUTES.CALENDAR, label: "Calendar" },
	{ route: ROUTES.PROFILE, label: "Profile" },
];

type Props = {
	currentRoute: AppRoute;
	onNavigate: (route: AppRoute) => void;
};

export function BottomNav({ currentRoute, onNavigate }: Props) {
	return (
		<View style={styles.container}>
			{ITEMS.map(({ route, label }) => {
				const active = currentRoute === route;
				return (
					<Pressable
						key={route}
						onPress={() => onNavigate(route)}
						style={[styles.item, active && styles.itemActive]}
					>
						<Text
							style={[styles.label, active && styles.labelActive]}
							numberOfLines={1}
						>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-around",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		backgroundColor: colors.white,
		borderTopWidth: 1,
		borderTopColor: colors.slate200,
	},
	item: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.sm,
	},
	itemActive: {},
	label: {
		fontSize: 12,
		fontWeight: "500",
		color: colors.slate500,
	},
	labelActive: {
		color: colors.primary,
		fontWeight: "600",
	},
});
