import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { App as DiemApp } from "./src/app";
import { initNotificationService } from "./src/services/notification/notification_service";

// Initialize notification service at the very beginning
initNotificationService().catch((err) =>
	console.error("[Notification] Top-level init failed:", err),
);

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<StatusBar style="dark" />
				<DiemApp />
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
