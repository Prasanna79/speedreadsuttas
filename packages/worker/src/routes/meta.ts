import { getSuttaMeta } from '../lib/data';

export async function handleSuttaMeta(uid: string): Promise<unknown> {
  return getSuttaMeta(uid);
}
