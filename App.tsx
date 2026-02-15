import { StatusBar } from "expo-status-bar";
import React from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Ignore specific warnings if needed, but keep errors visible
LogBox.ignoreLogs([
	"Project is incompatible", // We know about this one
	"SafeAreaView has been deprecated", // We are fixing this but some libs might still trigger it
]);

import { App as DiemApp } from "./src/app";

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
