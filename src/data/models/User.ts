import { Model } from "@nozbe/watermelondb";
import { date, json, text } from "@nozbe/watermelondb/decorators";

const sanitizeJson = (raw: unknown) =>
	typeof raw === "object" && raw !== null ? raw : {};

export default class User extends Model {
	static table = "users";

	@text("email") email!: string;
	@text("name") name!: string;
	@text("timezone") timezone!: string;
	@date("created_at") createdAt!: Date;
	@json("notification_settings", sanitizeJson) notificationSettings!: Record<
		string,
		unknown
	>;
}
