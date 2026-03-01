import { loadAnalyticsData } from "../analyticsData";

export type AnalyticsTimeframe = "Day" | "Week" | "Month";

export async function loadAnalyticsView(timeframe: AnalyticsTimeframe) {
	return loadAnalyticsData(timeframe);
}
