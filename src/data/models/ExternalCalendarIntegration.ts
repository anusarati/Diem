import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";

export default class ExternalCalendarIntegration extends Model {
	static table = "external_calendar_integrations";

	@text("provider") provider!: string;
	@text("external_account_id") externalAccountId!: string;
	@field("sync_enabled") syncEnabled!: boolean;
	@date("last_synced_at") lastSyncedAt!: Date;
	@text("default_replaceability") defaultReplaceability!: string;
}
