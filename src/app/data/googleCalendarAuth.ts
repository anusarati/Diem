/**
 * Google Calendar OAuth on web: same-window redirect so callback returns to the app.
 * 1. User clicks Import → we redirect window to Google.
 * 2. User signs in → Google redirects back to our redirect URI with ?code=...
 * 3. App loads at that URL → completePendingGoogleCalendarAuth() runs, exchanges code, runs import, clears URL.
 */

const PENDING_KEY = "google_calendar_pending_import";
const STATE_KEY = "google_calendar_oauth_state";
const VERIFIER_KEY = "google_calendar_oauth_code_verifier";

function isWeb(): boolean {
	return typeof window !== "undefined";
}

export async function getGoogleCalendarRedirectUri(): Promise<string> {
	try {
		const AuthSession = await import("expo-auth-session");
		return AuthSession.makeRedirectUri({
			scheme: "diem",
			path: "redirect",
		});
	} catch {
		return "diem://redirect";
	}
}

/**
 * Call this on app load (e.g. in AuthGate useEffect). If we landed back from Google with ?code=...,
 * exchanges the code for a token, runs the import if user had clicked Import, then clears URL and storage.
 */
export async function completePendingGoogleCalendarAuth(): Promise<void> {
	if (!isWeb() || !window.location) return;

	const params = new URLSearchParams(window.location.search);
	const code = params.get("code");
	const state = params.get("state");
	if (!code || !state) return;

	const savedState = sessionStorage.getItem(STATE_KEY);
	const codeVerifier = sessionStorage.getItem(VERIFIER_KEY);
	if (!savedState || state !== savedState || !codeVerifier) {
		console.warn("[Google Calendar] OAuth callback: invalid or missing state/verifier");
		clearOAuthFromUrl();
		return;
	}

	const clientId =
		typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
			? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
			: null;
	if (!clientId) {
		clearOAuthFromUrl();
		return;
	}

	try {
		const AuthSession = await import("expo-auth-session");
		const redirectUri = AuthSession.makeRedirectUri({
			scheme: "diem",
			path: "redirect",
		});

		// Web application: set EXPO_PUBLIC_GOOGLE_CLIENT_SECRET. Desktop app: leave unset (we send empty).
		const clientSecret =
			(typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET)?.trim() ?? "";
		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret,
			code_verifier: codeVerifier,
		});
		const res = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});
		const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
		if (!res.ok) {
			console.warn("[Google Calendar] Token exchange", res.status, data);
			clearOAuthFromUrl();
			sessionStorage.removeItem(STATE_KEY);
			sessionStorage.removeItem(VERIFIER_KEY);
			sessionStorage.removeItem(PENDING_KEY);
			return;
		}
		const token = data.access_token ?? null;
		sessionStorage.removeItem(STATE_KEY);
		sessionStorage.removeItem(VERIFIER_KEY);
		clearOAuthFromUrl();

		const runImport = sessionStorage.getItem(PENDING_KEY) === "1";
		sessionStorage.removeItem(PENDING_KEY);

		if (token && runImport) {
			const { importGoogleCalendar } = await import("./googleCalendarImport");
			const { Alert } = await import("react-native");
			const timeMin = new Date();
			timeMin.setDate(timeMin.getDate() - 30);
			const timeMax = new Date();
			timeMax.setDate(timeMax.getDate() + 90);
			try {
				const result = await importGoogleCalendar(token, { timeMin, timeMax });
				Alert.alert(
					"Import complete",
					result.imported > 0
						? `Imported ${result.imported} events.${result.skipped ? ` Skipped ${result.skipped} (already added).` : ""}`
						: `No new events.${result.skipped ? ` ${result.skipped} already in calendar.` : ""}`,
				);
			} catch (e) {
				Alert.alert(
					"Import failed",
					e instanceof Error ? e.message : String(e),
				);
			}
		}
	} catch (e) {
		console.warn("[Google Calendar] Token exchange failed", e);
		clearOAuthFromUrl();
		sessionStorage.removeItem(STATE_KEY);
		sessionStorage.removeItem(VERIFIER_KEY);
		sessionStorage.removeItem(PENDING_KEY);
	}
}

function clearOAuthFromUrl(): void {
	if (!isWeb() || !window.history) return;
	const path = window.location.pathname.replace(/\/redirect\/?$/, "") || "/";
	window.history.replaceState({}, "", window.location.origin + path);
}

/** On web, when we're redirecting to Google we return this so the caller doesn't show "no token" alert. */
export const GOOGLE_CALENDAR_REDIRECTING = "redirecting" as const;

/**
 * Get a Google OAuth access token. On web, if we're not in the callback, this redirects the window to Google and returns GOOGLE_CALENDAR_REDIRECTING.
 */
export async function getGoogleCalendarAccessToken(): Promise<
	string | null | typeof GOOGLE_CALENDAR_REDIRECTING
> {
	const clientId =
		typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
			? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
			: null;
	if (!clientId?.trim()) return null;

	try {
		const AuthSession = await import("expo-auth-session");
		const discovery = await AuthSession.fetchDiscoveryAsync(
			"https://accounts.google.com",
		);
		if (!discovery?.authorizationEndpoint) return null;

		const redirectUri = AuthSession.makeRedirectUri({
			scheme: "diem",
			path: "redirect",
		});

		const request = await AuthSession.loadAsync(
			{
				clientId,
				redirectUri,
				scopes: [
					"openid",
					"profile",
					"email",
					"https://www.googleapis.com/auth/calendar.events.readonly",
				],
				responseType: "code",
				usePKCE: true,
			},
			discovery,
		);

		if (isWeb() && typeof window !== "undefined") {
			const url = await request.makeAuthUrlAsync(discovery);
			sessionStorage.setItem(STATE_KEY, request.state);
			sessionStorage.setItem(VERIFIER_KEY, request.codeVerifier ?? "");
			sessionStorage.setItem(PENDING_KEY, "1");
			window.location.href = url;
			return GOOGLE_CALENDAR_REDIRECTING;
		}

		const result = await request.promptAsync(discovery);
		if (result.type !== "success" || !result.params?.code) return null;

		const tokenResponse = await AuthSession.exchangeCodeAsync(
			{
				clientId,
				code: result.params.code,
				redirectUri,
				clientSecret: "",
				...(request.codeVerifier && {
					extraParams: { code_verifier: request.codeVerifier },
				}),
			},
			discovery,
		);
		return tokenResponse?.accessToken ?? null;
	} catch {
		return null;
	}
}
