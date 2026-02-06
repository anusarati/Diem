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
        { name: "notification_settings", type: "string" }, // JSON
      ],
    }),
    tableSchema({
      name: "activities",
      columns: [
        { name: "category_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "priority", type: "number" },
        { name: "default_duration", type: "number" }, // minutes
        { name: "is_replaceable", type: "boolean" },
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
        { name: "start_time", type: "number", isIndexed: true },
        { name: "end_time", type: "number", isIndexed: true },
        { name: "duration", type: "number" },
        { name: "status", type: "string" }, // PREDICTED | CONFIRMED | ETC
        { name: "replaceability_status", type: "string" }, // HARD | SOFT
        { name: "priority", type: "number" },
        { name: "is_recurring", type: "boolean" },
        { name: "recurring_template_id", type: "string", isOptional: true },
        { name: "source", type: "string" },
        { name: "is_locked", type: "boolean" }, // User explicitly pinned this instance
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "constraints",
      columns: [
        { name: "type", type: "string", isIndexed: true }, // forbiddenTime | maxDaily | minGap | requiredSequence
        { name: "activity_id", type: "string", isOptional: true, isIndexed: true },
        { name: "category_id", type: "string", isOptional: true },
        { name: "value", type: "string" }, // JSON payload for specific constraint logic
        { name: "is_active", type: "boolean" },
        { name: "created_at", type: "number" },
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
        { name: "days_of_week", type: "string" }, // JSON array of numbers
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
        { name: "target_minutes", type: "number" },
        { name: "period", type: "string" }, // daily | weekly | monthly
        { name: "is_active", type: "boolean" },
        { name: "created_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "user_behavior",
      columns: [
        { name: "activity_id", type: "string", isOptional: true, isIndexed: true },
        { name: "category_id", type: "string", isIndexed: true },
        { name: "metric", type: "string" }, // HEURISTIC_DEPENDENCY | HEATMAP_PROBABILITY
        { name: "key_param", type: "string" }, // Stores "TimeOfDay" or "DependentActivityID"
        { name: "value", type: "number" }, // Probability (0-1) or Count
        { name: "sample_size", type: "number" },
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
        { name: "period_start", type: "number" },
        { name: "period_end", type: "number" },
        { name: "current_minutes", type: "number" },
        { name: "projected_minutes", type: "number" },
        { name: "status", type: "string" }, // ON_TRACK | AT_RISK | OFF_TRACK
        { name: "calculated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "external_calendar_integrations",
      columns: [
        { name: "provider", type: "string" },
        { name: "external_account_id", type: "string" },
        { name: "sync_enabled", type: "boolean" },
        { name: "last_synced_at", type: "number" },
        { name: "default_replaceability", type: "string" }, // HARD | SOFT
      ],
    }),
  ],
});
