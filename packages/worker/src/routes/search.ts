import { getSearchIndex } from '../lib/data';

export async function handleSearchIndex(): Promise<unknown> {
  return getSearchIndex();
}
