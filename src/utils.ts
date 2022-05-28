import { randomUUID } from 'node:crypto';

import * as IO from 'fp-ts/IO';

export function getRandomUUID(): IO.IO<string> {
  return () => randomUUID();
}
