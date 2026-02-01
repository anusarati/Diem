import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "users",
      columns: [
        { name: "email", type: "string" },
        { name: "name", type: "string" },
        { name: "timezone", type: "string" },
        { name: "created_at", type: "number" },
        { name: "notification_settings", type: "string" },
      ],
    }),
    tableSchema({
      name: "tasks",
      columns: [
        { name: "category_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "priority", type: "number" },
        { name: "color", type: "string" },
        { name: "created_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "scheduled_events",
      columns: [
        { name: "activity_id", type: "string", isIndexed: true },
        { name: "category_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "start_time", type: "number" },
        { name: "duration", type: "number" },
        { name: "end_time", type: "number" },
        { name: "status", type: "string" },
        { name: "replaceability_status", type: "string" },
        { name: "priority", type: "number" },
        { name: "is_recurring", type: "boolean" },
        { name: "recurring_template_id", type: "string", isOptional: true },
        { name: "source", type: "string" },
        { name: "replaced_by_activity_id", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "recurring_activities",
      columns: [
        { name: "template_id", type: "string", isIndexed: true },
        { name: "category_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "frequency", type: "string" },
        { name: "interval", type: "number" },
        { name: "days_of_week", type: "string" },
        { name: "start_date", type: "number" },
        { name: "preferred_start_time", type: "string" },
        { name: "typical_duration", type: "number" },
        { name: "priority", type: "number" },
        { name: "is_active", type: "boolean" },
      ],
    }),
    tableSchema({
      name: "goals",
      columns: [
        { name: "category_id", type: "string", isIndexed: true },
        { name: "target_minutes_per_week", type: "number" },
        { name: "is_active", type: "boolean" },
        { name: "created_at", type: "number" },
      ],
    }),
    // Add these to the 'tables' array in src/data/schema.ts

    tableSchema({
      name: "excluded_events",
      columns: [
        { name: "start_time", type: "number" },
        { name: "end_time", type: "number" },
        { name: "is_recurring", type: "boolean" },
        { name: "recurring_template_id", type: "string", isOptional: true },
        { name: "priority", type: "string" }, // ABSOLUTE or SOFT_PREFERENCE
        { name: "is_active", type: "boolean" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    tableSchema({
      name: "user_behavior",
      columns: [
        { name: "category_id", type: "string", isIndexed: true },
        { name: "metric", type: "string" }, // TYPICAL_DURATION, PREFERRED_TIME, etc.
        { name: "time_of_day", type: "string", isOptional: true },
        { name: "day_of_week", type: "number", isOptional: true },
        { name: "average_value", type: "number" },
        { name: "sample_size", type: "number" },
        { name: "confidence", type: "number" },
        { name: "last_updated", type: "number" },
      ],
    }),

    tableSchema({
      name: "activity_history",
      columns: [
        { name: "activity_id", type: "string", isIndexed: true },
        { name: "predicted_start_time", type: "number" },
        { name: "predicted_duration", type: "number" },
        { name: "actual_start_time", type: "number", isOptional: true },
        { name: "actual_duration", type: "number", isOptional: true },
        { name: "was_completed", type: "boolean" },
        { name: "was_skipped", type: "boolean" },
        { name: "was_replaced", type: "boolean" },
        { name: "notes", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
      ],
    }),

    tableSchema({
      name: "goal_progress",
      columns: [
        { name: "goal_id", type: "string", isIndexed: true },
        { name: "week_start_date", type: "number" },
        { name: "week_end_date", type: "number" },
        { name: "target_minutes", type: "number" },
        { name: "scheduled_minutes", type: "number" },
        { name: "completed_minutes", type: "number" },
        { name: "on_track", type: "boolean" },
        { name: "completion_rate", type: "number" },
        { name: "calculated_at", type: "number" },
      ],
    }),

    tableSchema({
      name: "external_calendar_integrations",
      columns: [
        { name: "provider", type: "string" }, // GOOGLE_CALENDAR, etc.
        { name: "external_account_id", type: "string" },
        { name: "access_token", type: "string" },
        { name: "refresh_token", type: "string" },
        { name: "sync_enabled", type: "boolean" },
        { name: "last_synced_at", type: "number" },
        { name: "default_replaceability", type: "string" },
      ],
    }),

    tableSchema({
      name: "predictions",
      columns: [
        { name: "start_date", type: "number" },
        { name: "end_date", type: "number" },
        { name: "algorithm_version", type: "string" },
        { name: "activities_generated", type: "number" },
        { name: "executed_at", type: "number" },
        { name: "execution_time_ms", type: "number" },
      ],
    }),
  ],
});
