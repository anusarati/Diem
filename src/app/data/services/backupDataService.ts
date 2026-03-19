import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/src/legacy/FileSystem";
import * as Sharing from "expo-sharing";

import { Alert, Platform } from "react-native";
import schema from "../../../data/schema";
import { withScopedRepositories } from "./repositoryContext";

interface BackupData {
	version: number;
	tables: {
		[tableName: string]: any[];
	};
	exportedAt: number;
}

export async function exportData(): Promise<void> {
	return withScopedRepositories(async (repositories) => {
		const database = repositories.database;
		const backup: BackupData = {
			version: schema.version,
			tables: {},
			exportedAt: Date.now(),
		};

		const tables = Object.values(schema.tables);

		for (const table of tables) {
			const collection = database.collections.get(table.name);
			const records = await collection.query().fetch();
			backup.tables[table.name] = records.map((r) => r._raw);
		}

		const jsonString = JSON.stringify(backup, null, 2);

		if (Platform.OS === "android") {
			// Android: Request permission to specify a directory (e.g., Downloads/Documents)
			const permissions =
				await StorageAccessFramework.requestDirectoryPermissionsAsync();

			if (permissions.granted) {
				const fileName = `diem_backup_${Date.now()}.json`;
				const fileUri = await StorageAccessFramework.createFileAsync(
					permissions.directoryUri,
					fileName,
					"application/json",
				);

				await StorageAccessFramework.writeAsStringAsync(fileUri, jsonString);
				Alert.alert("Success", `File saved successfully as ${fileName}`);
			} else {
				throw new Error("Folder permission was denied.");
			}
		} else {
			// iOS: Standard Sharing provides "Save to Files" directly inside sheet menu
			const fileUri = `${Paths.cache.uri}/diem_backup_${Date.now()}.json`;
			const file = new File(fileUri);
			file.write(jsonString);

			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(fileUri, {
					mimeType: "application/json",
					dialogTitle: "Export Diem Backup",
					UTI: "public.json",
				});
			} else {
				throw new Error("Sharing is not available on this device");
			}
		}
	});
}

export async function importData(): Promise<{
	success: boolean;
	message: string;
}> {
	return withScopedRepositories(async (repositories) => {
		const database = repositories.database;

		const result = await DocumentPicker.getDocumentAsync({
			type: "application/json",
			copyToCacheDirectory: true,
		});

		if (result.canceled) {
			return { success: false, message: "Import cancelled" };
		}

		const selectedFile = result.assets[0];
		const file = new File(selectedFile.uri);
		const jsonString = await file.text();

		let backup: BackupData;
		try {
			backup = JSON.parse(jsonString);
		} catch (err) {
			return { success: false, message: "Invalid JSON file structure" };
		}

		if (!backup.version || !backup.tables) {
			return { success: false, message: "Invalid backup format" };
		}

		if (backup.version > schema.version) {
			return {
				success: false,
				message: `Backup version (${backup.version}) is newer than app version (${schema.version}). Please update your app.`,
			};
		}

		try {
			// Batch creations using WatermelonDB batching
			await database.write(async () => {
				// Wipe everything
				await database.unsafeResetDatabase();

				const allOperations: any[] = [];

				for (const [tableName, records] of Object.entries(backup.tables)) {
					try {
						const collection = database.collections.get(tableName);
						for (const raw of records) {
							// Using prepareCreate to create a model template and mutate raw inside
							const op = collection.prepareCreate((record) => {
								Object.assign(record._raw, raw);
							});
							allOperations.push(op);
						}
					} catch (err) {
						console.error(`Error preparing table ${tableName}:`, err);
					}
				}

				if (allOperations.length > 0) {
					await database.batch(allOperations);
				}
			});

			return { success: true, message: "Data imported successfully" };
		} catch (err) {
			console.error("Failed to restore backup:", err);
			return {
				success: false,
				message: `Restore failed: ${(err as Error).message}`,
			};
		}
	});
}
