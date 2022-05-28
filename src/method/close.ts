import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { constVoid, identity, pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';

export function close(
  connection: AmqpConnectionManager,
  channel: ChannelWrapper,
): TE.TaskEither<unknown, void> {
  return pipe(
    TE.tryCatch(() => channel.close(), identity),
    TE.chain(() => TE.tryCatch(() => connection.close(), identity)),
    TE.map(constVoid),
  );
}
