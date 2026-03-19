import { makeRepositories } from "./src/app/data/services/repositoryContext.js";
import { addScheduledActivity } from "./src/app/data/services/scheduleService.js";
import { getDatabase } from "./src/data/database.js";
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "./src/types/domain.js";

async function run() {
	const database = getDatabase("default"); // or appropriate scope
	const repositories = makeRepositories("default");

	console.log("Adding recurring item...");
	const result = await addScheduledActivity(
		{
			activityId: "",
			categoryId: "Other",
			title: "Test Recurring",
			startTime: new Date().toISOString(),
			endTime: new Date(Date.now() + 3600000).toISOString(),
			duration: 60,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: 2,
			isRecurring: true,
			source: ActivitySource.USER_CREATED,
			isLocked: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			date: new Date().toISOString().split("T")[0],
		},
		{
			recurrencePattern: {
				frequency: "DAILY",
				interval: 1,
			},
		},
	);

	console.log("Result created ID:", result.id);
	const list = await repositories.schedule.listAll();
	console.log("Total scheduled events after:", list.length);
	for (const ev of list.filter((e) => e.title === "Test Recurring")) {
		console.log(" - Date:", ev.startTime);
	}
}

run().catch(console.error);
