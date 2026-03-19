function generateRecurrenceDates(startDate, pattern, maxInstances = 15) {
	const dates = [];
	const current = new Date(startDate);

	if (pattern.frequency === "DAILY") {
		for (let i = 0; i < maxInstances; i++) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + pattern.interval);
		}
	} else if (pattern.frequency === "WEEKLY") {
		const days =
			pattern.daysOfWeek && pattern.daysOfWeek.length > 0
				? pattern.daysOfWeek
				: [current.getDay()];

		for (let week = 0; week < maxInstances; week++) {
			const weekStart = new Date(current);
			for (const dayIndex of days) {
				const dayOffset = dayIndex - weekStart.getDay();
				const instanceDate = new Date(weekStart);
				instanceDate.setDate(weekStart.getDate() + dayOffset);
				if (instanceDate >= startDate) {
					dates.push(instanceDate);
				}
			}
			current.setDate(current.getDate() + 7 * pattern.interval);
		}
	} else if (pattern.frequency === "MONTHLY") {
		for (let i = 0; i < maxInstances; i++) {
			dates.push(new Date(current));
			current.setMonth(current.getMonth() + pattern.interval);
		}
	}

	return dates.sort((a, b) => a.getTime() - b.getTime());
}

// Test scenario
const start = new Date("2026-03-25T14:00:00.000Z"); // Wed
console.log("Start:", start.toISOString(), "Day:", start.getDay());

const pattern = {
	frequency: "WEEKLY",
	interval: 1,
	daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
};

const dates = generateRecurrenceDates(start, pattern);
console.log("Total dates:", dates.length);
for (const d of dates) {
	console.log(" -", d.toISOString(), "Day:", d.getDay());
}
