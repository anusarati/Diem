import { useMemo, useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

interface DatePickerModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (dateStr: string) => void;
	initialValue?: string; // "YYYY-MM-DD HH:MM"
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePickerModal({
	visible,
	onClose,
	onSave,
	initialValue,
}: DatePickerModalProps) {
	const [currentViewMonth, setCurrentViewMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
		if (initialValue && initialValue.trim() !== "") {
			// Standardize space to T for parsing if needed
			const d = new Date(initialValue.replace(" ", "T"));
			return isNaN(d.getTime()) ? null : d;
		}
		return null;
	});

	const [hours, setHours] = useState(() => selectedDate?.getHours() ?? 9);
	const [minutes, setMinutes] = useState(() => selectedDate?.getMinutes() ?? 0);

	const calendarDays = useMemo(() => {
		const year = currentViewMonth.getFullYear();
		const month = currentViewMonth.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const totalDays = lastDay.getDate();
		const firstDayOfWeek = firstDay.getDay(); // 0=Sun

		const days = [];

		// Leading days
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			days.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false,
			});
		}

		// Current month days
		for (let i = 1; i <= totalDays; i++) {
			days.push({
				date: new Date(year, month, i),
				isCurrentMonth: true,
			});
		}

		// Trailing days
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			days.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
			});
		}

		return days;
	}, [currentViewMonth]);

	const handleSave = () => {
		if (!selectedDate) return;
		const year = selectedDate.getFullYear();
		const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
		const day = String(selectedDate.getDate()).padStart(2, "0");
		const hh = String(hours).padStart(2, "0");
		const mm = String(minutes).padStart(2, "0");
		onSave(`${year}-${month}-${day} ${hh}:${mm}`);
		onClose();
	};

	const formatSelectedHeader = () => {
		if (!selectedDate) return "Pick a date";
		return selectedDate.toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<Modal visible={visible} transparent animationType="fade">
			<View style={styles.overlay}>
				<TouchableOpacity
					style={styles.backdrop}
					activeOpacity={1}
					onPress={onClose}
				/>
				<View style={styles.modalContent}>
					<View style={styles.header}>
						<Text style={styles.title}>Select Deadline</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeIcon}>
							<Text style={styles.closeIconText}>✕</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.selectedContainer}>
						<Text style={styles.selectedLabel}>Target Date</Text>
						<Text style={styles.selectedValue}>{formatSelectedHeader()}</Text>
					</View>

					{/* Calendar View */}
					<View style={styles.calendarCard}>
						<View style={styles.monthNav}>
							<TouchableOpacity
								onPress={() => {
									const prev = new Date(currentViewMonth);
									prev.setMonth(prev.getMonth() - 1);
									setCurrentViewMonth(prev);
								}}
							>
								<Text style={styles.navArrow}>◀</Text>
							</TouchableOpacity>
							<Text style={styles.monthLabel}>
								{currentViewMonth.toLocaleDateString("en-US", {
									month: "long",
									year: "numeric",
								})}
							</Text>
							<TouchableOpacity
								onPress={() => {
									const next = new Date(currentViewMonth);
									next.setMonth(next.getMonth() + 1);
									setCurrentViewMonth(next);
								}}
							>
								<Text style={styles.navArrow}>▶</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.daysHeader}>
							{DAYS_SHORT.map((d) => (
								<Text key={d} style={styles.dayHeaderText}>
									{d}
								</Text>
							))}
						</View>

						<View style={styles.grid}>
							{calendarDays.map((d, i) => {
								const isSelected =
									selectedDate?.toDateString() === d.date.toDateString();
								const isToday =
									new Date().toDateString() === d.date.toDateString();

								return (
									<TouchableOpacity
										// biome-ignore lint/suspicious/noArrayIndexKey: indices are stable for static calendar grid
										key={d.date.toISOString() + i}
										style={[
											styles.dayCell,
											isSelected && styles.selectedDayCell,
											!d.isCurrentMonth && styles.notCurrentMonthCell,
										]}
										onPress={() => setSelectedDate(d.date)}
									>
										<Text
											style={[
												styles.dayText,
												isSelected && styles.selectedDayText,
												!d.isCurrentMonth && styles.notCurrentMonthText,
												isToday && !isSelected && styles.todayText,
											]}
										>
											{d.date.getDate()}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					{/* Time Selection */}
					<View style={styles.timeSection}>
						<Text style={styles.sectionLabel}>Time (24h)</Text>
						<View style={styles.timePickerRow}>
							<View style={styles.timeColumn}>
								<Text style={styles.timeSubLabel}>Hour</Text>
								<ScrollView
									style={styles.timeScroll}
									showsVerticalScrollIndicator={false}
									nestedScrollEnabled
								>
									{Array.from({ length: 24 }).map((_, i) => (
										<TouchableOpacity
											// biome-ignore lint/suspicious/noArrayIndexKey: hours are static 0-23
											key={`hour-${i}`}
											style={[
												styles.timeItem,
												hours === i && styles.selectedTimeItem,
											]}
											onPress={() => setHours(i)}
										>
											<Text
												style={[
													styles.timeText,
													hours === i && styles.selectedTimeText,
												]}
											>
												{String(i).padStart(2, "0")}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>

							<Text style={styles.timeColon}>:</Text>

							<View style={styles.timeColumn}>
								<Text style={styles.timeSubLabel}>Minute</Text>
								<ScrollView
									style={styles.timeScroll}
									showsVerticalScrollIndicator={false}
									nestedScrollEnabled
								>
									{Array.from({ length: 60 }).map((_, i) => (
										<TouchableOpacity
											// biome-ignore lint/suspicious/noArrayIndexKey: minutes are static 0-59
											key={`min-${i}`}
											style={[
												styles.timeItem,
												minutes === i && styles.selectedTimeItem,
											]}
											onPress={() => setMinutes(i)}
										>
											<Text
												style={[
													styles.timeText,
													minutes === i && styles.selectedTimeText,
												]}
											>
												{String(i).padStart(2, "0")}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</View>
					</View>

					<View style={styles.footer}>
						<View style={styles.footerShortcuts}>
							<TouchableOpacity
								onPress={() => {
									const now = new Date();
									setSelectedDate(now);
									setCurrentViewMonth(now);
								}}
								style={styles.shortcutBtn}
							>
								<Text style={styles.shortcutText}>Today</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									setSelectedDate(null);
								}}
								style={styles.shortcutBtn}
							>
								<Text style={styles.shortcutText}>Clear</Text>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={[styles.saveBtn, !selectedDate && styles.saveBtnDisabled]}
							onPress={handleSave}
							disabled={!selectedDate}
						>
							<Text style={styles.saveBtnText}>Apply Deadline</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
	},
	modalContent: {
		width: "100%",
		maxWidth: 400,
		backgroundColor: "#FFF",
		borderRadius: 24,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	title: {
		fontSize: 22,
		fontWeight: "800",
		color: colors.slate800,
	},
	closeIcon: {
		padding: 4,
	},
	closeIconText: {
		fontSize: 18,
		color: colors.slate400,
		fontWeight: "600",
	},
	selectedContainer: {
		marginBottom: 20,
		padding: 16,
		backgroundColor: colors.slate50,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	selectedLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: colors.slate400,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	selectedValue: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.primary,
	},
	calendarCard: {
		backgroundColor: "#FFF",
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.slate100,
		padding: 12,
		marginBottom: 20,
	},
	monthNav: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16,
		paddingHorizontal: 8,
	},
	navArrow: {
		fontSize: 16,
		color: colors.slate400,
		padding: 8,
	},
	monthLabel: {
		fontSize: 16,
		fontWeight: "700",
		color: colors.slate700,
	},
	daysHeader: {
		flexDirection: "row",
		marginBottom: 8,
	},
	dayHeaderText: {
		flex: 1,
		textAlign: "center",
		fontSize: 12,
		fontWeight: "700",
		color: colors.slate300,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	dayCell: {
		width: "14.28%",
		aspectRatio: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 10,
	},
	selectedDayCell: {
		backgroundColor: colors.primary,
	},
	notCurrentMonthCell: {
		opacity: 0.3,
	},
	dayText: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate800,
	},
	selectedDayText: {
		color: "#FFF",
	},
	notCurrentMonthText: {
		color: colors.slate400,
	},
	todayText: {
		color: colors.primary,
		textDecorationLine: "underline",
	},
	timeSection: {
		marginBottom: 24,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: 12,
	},
	timePickerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.slate50,
		borderRadius: 16,
		padding: 12,
	},
	timeColumn: {
		flex: 1,
		alignItems: "center",
	},
	timeSubLabel: {
		fontSize: 10,
		fontWeight: "700",
		color: colors.slate400,
		marginBottom: 8,
		textTransform: "uppercase",
	},
	timeScroll: {
		height: 100,
		width: "100%",
	},
	timeItem: {
		height: 36,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 8,
		marginVertical: 2,
	},
	selectedTimeItem: {
		backgroundColor: colors.primary,
	},
	timeText: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.slate700,
	},
	selectedTimeText: {
		color: "#FFF",
	},
	timeColon: {
		fontSize: 24,
		fontWeight: "700",
		color: colors.slate300,
		marginHorizontal: 8,
		paddingTop: 16,
	},
	footer: {
		gap: 16,
	},
	footerShortcuts: {
		flexDirection: "row",
		gap: 12,
	},
	shortcutBtn: {
		flex: 1,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: colors.slate200,
	},
	shortcutText: {
		fontSize: 14,
		fontWeight: "700",
		color: colors.slate600,
	},
	saveBtn: {
		height: 54,
		backgroundColor: colors.slate800,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	saveBtnDisabled: {
		opacity: 0.5,
	},
	saveBtnText: {
		color: "#FFF",
		fontSize: 16,
		fontWeight: "700",
	},
});
