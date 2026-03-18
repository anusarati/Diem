import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { App as DiemApp } from "./src/app";
import { initNotificationService } from "./src/services/notification/notification_service";

if (__DEV__) {
	// Expose test handles on globalThis so the RN DevTools console can access
	// them without require() (which doesn't exist in the Hermes bundle env).
	const { DiemScheduler } = require("./native-modules/diem-scheduler/src");
	const { pack, unpack } = require("msgpackr");
	const { NativeScheduler } = require("./src/bridge/jsi/native_scheduler");
	(globalThis as any).__diemDebug = {
		DiemScheduler,
		pack,
		unpack,
		NativeScheduler,
	};
	console.log("[DEV] __diemDebug exposed on globalThis");
}

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
