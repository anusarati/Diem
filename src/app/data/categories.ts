/** Category options used for activities and Google Calendar import matching. */
export const ACTIVITY_CATEGORIES = [
	"Work",
	"Study",
	"Fitness",
	"Personal",
	"Other",
] as const;

export type ActivityCategoryId = (typeof ACTIVITY_CATEGORIES)[number];

/**
 * Keywords (lowercase) that map to category ID for auto-assignment (e.g. from event names).
 * First match wins; order matters.
 */
export const CATEGORY_KEYWORDS: {
	keywords: string[];
	categoryId: ActivityCategoryId;
}[] = [
	{ keywords: ["work", "meeting", "office", "project"], categoryId: "Work" },
	{
		keywords: ["study", "class", "lecture", "homework", "exam"],
		categoryId: "Study",
	},
	{
		keywords: ["fitness", "gym", "workout", "exercise", "run", "yoga"],
		categoryId: "Fitness",
	},
	{
		keywords: ["personal", "family", "doctor", "appointment"],
		categoryId: "Personal",
	},
];

export const DEFAULT_CATEGORY_FOR_MATCH = "Other" as const;

/**
 * Picks a category ID if the given text contains any keyword for that category.
 */
export function matchCategoryFromText(text: string): ActivityCategoryId {
	const lower = text.trim().toLowerCase();
	for (const { keywords, categoryId } of CATEGORY_KEYWORDS) {
		if (keywords.some((k) => lower.includes(k))) return categoryId;
	}
	return DEFAULT_CATEGORY_FOR_MATCH;
}
