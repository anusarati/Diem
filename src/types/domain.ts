export enum EventStatus {
  PREDICTED = 'PREDICTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  REPLACED = 'REPLACED'
}

export enum Replaceability {
  HARD = 'HARD',
  SOFT = 'SOFT'
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum ActivitySource {
  USER_CREATED = 'USER_CREATED',
  SYSTEM_PREDICTED = 'SYSTEM_PREDICTED',
  EXTERNAL_IMPORT = 'EXTERNAL_IMPORT'
} 