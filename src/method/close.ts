import { AmqpConnectionManager } from 'amqp-connection-manager';
import { identity } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';

export function close(
  connection: AmqpConnectionManager,
): TE.TaskEither<unknown, void> {
  return TE.tryCatch(() => connection.close(), identity);
}
