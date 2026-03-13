import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const run = (cmd, args, opts = {}) =>
	spawnSync(cmd, args, {
		cwd: process.cwd(),
		encoding: "utf8",
		...opts,
	});

function expectCommandSuccess(cmd, args) {
	const result = run(cmd, args);
	assert.equal(
		result.status,
		0,
		`${cmd} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
	);
	return result;
}

function collectFiles(rootPath) {
	const stat = statSync(rootPath);
	if (stat.isFile()) {
		return [rootPath];
	}

	const out = [];
	for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name.startsWith(".")) {
			continue;
		}
		const fullPath = join(rootPath, entry.name);
		if (entry.isDirectory()) {
			out.push(...collectFiles(fullPath));
		} else if (entry.isFile()) {
			out.push(fullPath);
		}
	}
	return out;
}

function expectNoMatches(pattern, rootPath) {
	const regex = new RegExp(pattern);
	const matches = [];
	for (const filePath of collectFiles(rootPath)) {
		const source = read(filePath);
		if (regex.test(source)) {
			matches.push(filePath);
		}
	}

	assert.equal(
		matches.length,
		0,
		`Expected no matches for ${pattern} in ${rootPath}, got:\n${matches.join("\n")}`,
	);
}

test("repositories expose required L1 CRUD and observe APIs", () => {
	const activityRepo = read("src/data/repositories/ActivityRepository.ts");
	assert.match(activityRepo, /async list\(/);
	assert.match(activityRepo, /async get\(/);
	assert.match(activityRepo, /observeList\(/);
	assert.match(activityRepo, /observeById\(/);
	assert.match(activityRepo, /async create\(/);
	assert.match(activityRepo, /async update\(/);
	assert.match(activityRepo, /async delete\(/);

	const historyRepo = read("src/data/repositories/HistoryRepository.ts");
	assert.match(historyRepo, /async recordCompletion\(/);
	assert.match(historyRepo, /async listByRange\(/);
	assert.match(historyRepo, /async listByActivity\(/);
	assert.match(historyRepo, /observeByRange\(/);

	const scheduleRepo = read("src/data/repositories/ScheduleRepository.ts");
	assert.match(scheduleRepo, /async listRange\(/);
	assert.match(scheduleRepo, /observeRange\(/);
	assert.match(scheduleRepo, /async create\(/);
	assert.match(scheduleRepo, /async update\(/);
	assert.match(scheduleRepo, /async delete\(/);

	const constraintRepo = read("src/data/repositories/ConstraintRepository.ts");
	assert.match(constraintRepo, /async listActive\(/);
	assert.match(constraintRepo, /observeActive\(/);
	assert.match(constraintRepo, /async upsert\(/);
	assert.match(constraintRepo, /async setActive\(/);
	assert.match(constraintRepo, /async delete\(/);

	const userBehaviorRepo = read(
		"src/data/repositories/UserBehaviorRepository.ts",
	);
	assert.match(userBehaviorRepo, /async listAll\(/);
	assert.match(userBehaviorRepo, /observeAll\(/);
	assert.match(userBehaviorRepo, /async listByMetric\(/);
	assert.match(userBehaviorRepo, /observeByMetric\(/);
	assert.match(userBehaviorRepo, /async listForActivity\(/);
	assert.match(userBehaviorRepo, /observeForActivity\(/);
});

test("DB partition naming and scoped factory are present", () => {
	const databaseShared = read("src/data/database.shared.ts");
	assert.match(databaseShared, /const DB_NAME_PREFIX = "diem"/);
	assert.match(databaseShared, /databaseInstances = new Map/);
	assert.match(databaseShared, /return `\$\{DB_NAME_PREFIX\}_\$\{safeScope\}`/);
	assert.match(databaseShared, /databaseInstances\.set\(safeScope, database\)/);

	const databaseNative = read("src/data/database.native.ts");
	assert.match(databaseNative, /getScopedDatabase/);
	assert.match(databaseNative, /createAdapterBaseOptions/);
	assert.match(databaseNative, /new SQLiteAdapter/);

	const databaseWeb = read("src/data/database.ts");
	assert.match(databaseWeb, /getScopedDatabase/);
	assert.match(databaseWeb, /createAdapterBaseOptions/);
	assert.match(databaseWeb, /new LokiJSAdapter/);
});

test("completion pipeline is history-driven through HistoryWriteService", () => {
	const homeService = read("src/app/data/services/homeService.ts");
	assert.match(
		homeService,
		/new HistoryWriteService\(repositories\.database\)/,
	);
	assert.match(homeService, /\.recordCompletion\(\{/);
	assert.match(homeService, /historyId: history\?\.id/);

	const historyWriteService = read(
		"src/mining/processor/history_write_service.ts",
	);
	assert.match(historyWriteService, /historyId\?: string/);
	assert.match(historyWriteService, /upsertCompletion\(\{/);
	assert.match(
		historyWriteService,
		/await this\.frequencyMiner\.ingestCompletion/,
	);
});

test("service mapping and compile/contracts regression checks", () => {
	const dtoMapper = read("src/data/mappers/model_to_dto.ts");
	assert.match(dtoMapper, /export function toActivityEntity/);
	assert.match(dtoMapper, /export function toScheduledEventEntity/);
	assert.match(dtoMapper, /export function toActivityHistoryEntity/);
	assert.match(dtoMapper, /export function toConstraintEntity/);
	assert.match(dtoMapper, /export function toUserBehaviorEntity/);

	expectCommandSuccess("npx", ["tsc", "--noEmit"]);

	expectNoMatches('from \\"\\.\\.?/data/storage\\"', "src/app/screens");
	expectNoMatches('from \\"\\.\\.?/data/storage\\"', "src/app/components");
	expectNoMatches("subtitle|iconBg|actualMinutesSpent", "src/app/types");
});
