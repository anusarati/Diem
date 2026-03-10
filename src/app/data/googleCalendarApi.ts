/**
 * Google Calendar API v3 – fetch events (single calendar, one-time import).
 * Requires access token with scope https://www.googleapis.com/auth/calendar.events.readonly
 */

export interface GoogleCalendarDateTime {
	dateTime?: string; // RFC3339
	date?: string; // YYYY-MM-DD for all-day
	timeZone?: string;
}

export interface GoogleCalendarEvent {
	id: string;
	status?: string; // "confirmed" | "tentative" | "cancelled"
	summary?: string;
	description?: string;
	location?: string;
	start?: GoogleCalendarDateTime;
	end?: GoogleCalendarDateTime;
	created?: string;
	updated?: string;
	recurrence?: string[];
	recurringEventId?: string;
	locked?: boolean;
}

export interface GoogleCalendarEventsResponse {
	items?: GoogleCalendarEvent[];
	nextPageToken?: string;
}

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Fetch events from primary calendar. Uses singleEvents=true so recurring events
 * are expanded into individual instances.
 */
export async function fetchGoogleCalendarEvents(
	accessToken: string,
	timeMin: Date,
	timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
	const params = new URLSearchParams({
		singleEvents: "true",
		timeMin: timeMin.toISOString(),
		timeMax: timeMax.toISOString(),
	});
	const url = `${CALENDAR_API}?${params.toString()}`;
	console.log("[Google Calendar API] GET", url.slice(0, 120) + "...");
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const data = (await res.json()) as GoogleCalendarEventsResponse;
	const items = data.items ?? [];
	console.log("[Google Calendar API] status", res.status, "items", items.length);
	if (!res.ok) {
		const text = JSON.stringify(data);
		throw new Error(`Google Calendar API error: ${res.status} ${text}`);
	}
	return items;
}
