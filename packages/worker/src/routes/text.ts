import type { Env } from '../lib/data';
import { getSuttaText } from '../lib/data';

export async function handleSuttaText(
  env: Env,
  uid: string,
  lang: string,
  author: string,
): Promise<unknown> {
  return getSuttaText(env, uid, lang, author);
}
