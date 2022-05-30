import { ChannelWrapper } from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import { constVoid, pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';

import { FpLogger } from '../support/logger';
import { getRandomUUID } from '../utils';

export function publish<Payload>(
  channel: ChannelWrapper,
  logger: FpLogger,
): (
  exchange: string,
  routingKey: string,
  payload: Payload,
  publishOptions?: amqplib.Options.Publish,
) => TE.TaskEither<unknown, void> {
  return (exchange, routingKey, payload, publishOptions) => {
    const publishLogger = logger.child({ exchange, routingKey });

    return () => {
      publishLogger.trace('Publishing message', { payload });

      return pipe(
        TE.tryCatch(
          () =>
            channel.publish(
              exchange,
              routingKey,
              Buffer.from(JSON.stringify(payload)),
              {
                ...publishOptions,
                contentType: 'application/json',
                messageId: getRandomUUID(),
              },
            ),
          publishLogger.idError('Failed to publish message', 'err'),
        ),
        TE.map(constVoid),
      )();
    };
  };
}
