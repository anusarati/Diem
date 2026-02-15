import { AuthGate } from "./components/AuthGate";

/**
 * App entry for React Native.
 * Shows login/register when not logged in; main app (with per-user data) when logged in.
 */
export function App() {
	return <AuthGate />;
}
