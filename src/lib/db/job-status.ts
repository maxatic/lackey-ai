// Client-safe pipeline-status metadata. No server imports — usable in 'use client' components.
export const JOB_STATUSES = [
  'saved',
  'prepared',
  'applied',
  'interviewing',
  'offer',
  'rejected',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  prepared: 'Prepared',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export function isJobStatus(v: unknown): v is JobStatus {
  return typeof v === 'string' && (JOB_STATUSES as readonly string[]).includes(v);
}
