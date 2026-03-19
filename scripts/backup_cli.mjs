#!/usr/bin/env node

/**
 * CLI Tool to back up and restore the SQLite database from Android/iOS emulators
 * to/from the local workspace.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ANDROID_PKG = "com.diem.app";
const IOS_BUNDLE_ID = "com.arshiyasalehi.diemapp";
const BACKUP_DIR = resolve(process.cwd(), "backups");

function ensureBackupDir() {
	if (!existsSync(BACKUP_DIR)) {
		mkdirSync(BACKUP_DIR);
	}
}

function run(cmd, suppressOutput = false) {
	try {
		return execSync(cmd, {
			stdio: suppressOutput ? "pipe" : "inherit",
			encoding: "utf-8",
		});
	} catch (err) {
		if (suppressOutput) throw err;
		console.error(`❌ Command failed: ${cmd}`);
		process.exit(1);
	}
}

function getAndroidBackupFile(scope = "guest") {
	return scope === "default" ? "diem.db" : `diem_${scope}.db`;
}

function exportAndroid(scope) {
	const dbFile = getAndroidBackupFile(scope);
	const targetPath = resolve(BACKUP_DIR, `${dbFile}_backup_${Date.now()}`);
	ensureBackupDir();

	console.log(`Pulling ${dbFile} from Android device...`);
	try {
		// For modern Android, adb exec-out is binary safe without line translation
		run(`adb exec-out "run-as ${ANDROID_PKG} cat ${dbFile}" > "${targetPath}"`);

		console.log(`✅ Successfully exported to: ${targetPath}`);
		console.log(`💡 You can copy this file back using the import command.`);
	} catch (err) {
		console.error(
			`❌ Fails to pull from android device. Ensure that your app is a debug build and the device is authorized.`,
		);
	}
}

function importAndroid(scope, filePath) {
	if (!filePath || !existsSync(filePath)) {
		console.error(`❌ File not found at: ${filePath}`);
		process.exit(1);
	}

	const dbFile = getAndroidBackupFile(scope);
	const stagingFile = `${dbFile}_staging_${Date.now()}`;
	console.log(`Restoring ${filePath} to Android app as ${dbFile}...`);

	try {
		// 1. Force stop app to release database locks
		console.log(`Stopping app ${ANDROID_PKG}...`);
		run(`adb shell am force-stop ${ANDROID_PKG}`);

		// 2. Push to local staging with a unique name to avoid adb push "skipped" caching bug
		// Using cat | adb shell to bypass any adb push caching/skipping issues
		run(`cat "${filePath}" | adb shell "cat > /data/local/tmp/${stagingFile}"`);
		run(`adb shell chmod 666 /data/local/tmp/${stagingFile}`);

		// 3. Complete copy and delete existing journaling locks (WAL format)
		run(
			`adb shell "run-as ${ANDROID_PKG} cp /data/local/tmp/${stagingFile} ./${dbFile}"`,
		);
		run(
			`adb shell "run-as ${ANDROID_PKG} rm -f ./${dbFile}-shm ./${dbFile}-wal"`,
		);
		run(`adb shell rm /data/local/tmp/${stagingFile}`);

		console.log(`✅ Successfully restored! Please restart the app.`);
	} catch (err) {
		console.error(`❌ Restore failed.`);
	}
}

function exportIos(scope) {
	const dbFile = getAndroidBackupFile(scope); // same naming
	const targetPath = resolve(BACKUP_DIR, `${dbFile}_backup_${Date.now()}`);
	ensureBackupDir();

	console.log(`Pulling ${dbFile} from iOS Simulator...`);
	try {
		const simDir = run(
			`xcrun simctl get_app_container booted ${IOS_BUNDLE_ID} data`,
			true,
		).trim();
		const sourcePath = resolve(simDir, dbFile);
		run(`cp "${sourcePath}" "${targetPath}"`);
		console.log(`✅ Successfully exported to: ${targetPath}`);
	} catch (err) {
		console.error(
			`❌ Fails to read from iOS Simulator. Ensure the app is running on a booted simulator.`,
		);
	}
}

function importIos(scope, filePath) {
	if (!filePath || !existsSync(filePath)) {
		console.error(`❌ File not found at: ${filePath}`);
		process.exit(1);
	}

	const dbFile = getAndroidBackupFile(scope);
	console.log(`Restoring ${filePath} to iOS Simulator as ${dbFile}...`);

	try {
		const simDir = run(
			`xcrun simctl get_app_container booted ${IOS_BUNDLE_ID} data`,
			true,
		).trim();
		const destPath = resolve(simDir, dbFile);
		run(`cp "${filePath}" "${destPath}"`);
		console.log(`✅ Successfully restored!`);
	} catch (err) {
		console.error(`❌ Restore failed.`);
	}
}

const args = process.argv.slice(2);
const helpText = `
Diem Backup CLI
Usage:
  node scripts/backup_cli.mjs <action> <platform> [options]

Actions:
  export        Export database from device
  import        Import database to device

Platforms:
  android
  ios

Options:
  --scope <id>  Specify the database scope (e.g., guest, default, user_...). Defaults to 'guest'
  --file <path> File path to use for import. Required for import action.

Examples:
  node scripts/backup_cli.mjs export android
  node scripts/backup_cli.mjs import android --file ./backups/diem_guest.db_backup_123456789
`;

if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
	console.log(helpText);
	process.exit(0);
}

const action = args[0];
const platform = args[1];

let scope = "guest";
let filePath = null;

for (let i = 2; i < args.length; i++) {
	if (args[i] === "--scope" && args[i + 1]) {
		scope = args[i + 1];
		i++;
	} else if (args[i] === "--file" && args[i + 1]) {
		filePath = args[i + 1];
		i++;
	}
}

if (action === "export") {
	if (platform === "android") exportAndroid(scope);
	else if (platform === "ios") exportIos(scope);
	else console.error("❌ Unknown platform");
} else if (action === "import") {
	if (!filePath) {
		console.error("❌ Error: --file <path> is required for import action.");
		process.exit(1);
	}
	if (platform === "android") importAndroid(scope, filePath);
	else if (platform === "ios") importIos(scope, filePath);
	else console.error("❌ Unknown platform");
} else {
	console.error("❌ Unknown action");
}
