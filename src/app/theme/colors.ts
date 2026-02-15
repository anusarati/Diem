/**
 * Design tokens from the HTML mockups.
 * Home: primary (seafoam), marshmallow, cloud.
 * Analysis: mint, peach, lavender, soft-pink.
 */
export const colors = {
	// Home / shared
	primary: "#0D9488", // Teal 600 - Vibrant and dark enough for white text
	marshmallow: "#E11D48", // Rose 600
	cloud: "#F9FBFB",
	backgroundLight: "#F8FAFC", // Slate 50
	backgroundDark: "#0F172A", // Slate 900

	// Analysis page -- UPDATED TO BE VIBRANT & READABLE with white text
	mint: "#10B981", // Emerald 500
	mintDark: "#047857", // Emerald 700
	peach: "#F97316", // Orange 500
	peachDark: "#C2410C", // Orange 700
	lavender: "#6366F1", // Indigo 500
	lavenderDark: "#4338CA", // Indigo 700
	softPink: "#EC4899", // Pink 500
	softPinkDark: "#BE185D", // Pink 700
	background: "#FDFFFF",

	// Neutrals
	white: "#FFFFFF",
	slate50: "#F8FAFC",
	slate100: "#F1F5F9",
	slate200: "#E2E8F0",
	slate300: "#CBD5E1",
	slate400: "#94A3B8",
	slate500: "#64748B",
	slate600: "#475569",
	slate700: "#334155",
	slate800: "#1E293B",
	slate900: "#0F172A",
	red400: "#F87171",
	red300: "#FCA5A5",
} as const;
