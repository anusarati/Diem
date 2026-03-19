import { makeRepositories } from "./src/app/data/services/repositoryContext.js";
import { getDatabase } from "./src/data/database.js";

async function run() {
	const database = getDatabase("default");
	const repositories = makeRepositories("default");

	const list = await repositories.schedule.listAll();
	console.log("Total scheduled events:", list.length);
	for (const ev of list) {
		console.log(
			` - ${ev.title} (${ev.startTime.toISOString()}) isRecurring=${ev.isRecurring}`,
		);
	}
}

run().catch(console.error);
