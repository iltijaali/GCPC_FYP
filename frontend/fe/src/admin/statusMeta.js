import { FiCheckCircle, FiClock, FiLoader } from 'react-icons/fi';

// One place that says what each complaint status looks like everywhere (chart, badge, map, legend).
// Colour follows the status, never its rank; the icon means colour is never the only cue.
export const STATUS_META = {
  Pending: { color: 'var(--s-pending)', Icon: FiClock, hint: 'Waiting for someone to look at it' },
  'In Progress': { color: 'var(--s-progress)', Icon: FiLoader, hint: 'Being handled' },
  Resolved: { color: 'var(--s-resolved)', Icon: FiCheckCircle, hint: 'Closed' },
};
export const STATUSES = Object.keys(STATUS_META);
