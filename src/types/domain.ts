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

export enum ConstraintType {
  FORBIDDEN_TIME = 'forbiddenTime',
  MAX_DAILY = 'maxDaily',
  MIN_GAP = 'minGap',
  REQUIRED_SEQUENCE = 'requiredSequence'
}

export enum GoalPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export enum GoalStatus {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  OFF_TRACK = 'OFF_TRACK'
}