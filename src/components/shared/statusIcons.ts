import { BadgeCheck, CircleDotDashed, Gauge, Workflow } from 'lucide-react';

import type { TaskStatus } from '../../lib/types';

export const statusIcons = {
  todo: CircleDotDashed,
  in_progress: Workflow,
  in_review: Gauge,
  done: BadgeCheck,
} satisfies Record<TaskStatus, typeof CircleDotDashed>;
