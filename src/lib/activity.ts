import { statusLabel } from './boardLogic';
import type { ActivityEvent, TaskStatus } from './types';

/** Derive the human-readable detail chips shown under an activity timeline event. */
export function describeActivityMetadata(event: ActivityEvent): string[] {
  const metadata = event.metadata ?? {};
  const details: string[] = [];

  if (typeof metadata.from === 'string' && typeof metadata.to === 'string') {
    details.push(`${statusLabel(metadata.from as TaskStatus)} -> ${statusLabel(metadata.to as TaskStatus)}`);
  }
  if (Array.isArray(metadata.fields) && metadata.fields.length) {
    details.push(`Fields: ${metadata.fields.join(', ')}`);
  }
  if (metadata.assigneesChanged) details.push('Assignees changed');
  if (metadata.labelsChanged) details.push('Labels changed');
  if (typeof metadata.title === 'string') details.push(`Task: ${metadata.title}`);
  if (typeof metadata.comment_id === 'string') details.push('Comment event');

  return details;
}
