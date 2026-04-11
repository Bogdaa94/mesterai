import { Timestamp } from 'firebase/firestore';

export function timeAgo(timestamp: Timestamp): string {
  const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
  if (seconds < 60) return 'acum câteva secunde';
  if (seconds < 3600) return `acum ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `acum ${Math.floor(seconds / 3600)} ore`;
  return `acum ${Math.floor(seconds / 86400)} zile`;
}
