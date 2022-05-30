import { randomUUID } from 'node:crypto';

import { identity } from 'fp-ts/function';
import * as IO from 'fp-ts/IO';
import * as TE from 'fp-ts/TaskEither';

import { RabbitMQAdapter } from './types';

export const getRandomUUID: IO.IO<string> = () => randomUUID();

export const waitForConnect: (
  adapter: RabbitMQAdapter,
) => TE.TaskEither<unknown, void> = (adapter) =>
  TE.tryCatch(() => adapter.channel.waitForConnect(), identity);
