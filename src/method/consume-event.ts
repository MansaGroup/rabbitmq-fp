import { ChannelWrapper } from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import { constVoid, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { FpLogger } from 'src/support/logger';
import { EventHandler } from 'src/types';

export function consumeEvent<Payload>(
  channel: ChannelWrapper,
  logger: FpLogger,
): (
  queueName: string,
  handler: EventHandler<Payload>,
) => TE.TaskEither<unknown, void> {
  return (queueName, handler) => {
    const queueLogger = logger.child({ queue: queueName });

    const handlerWrapper = (msg: amqplib.ConsumeMessage): Promise<void> =>
      pipe(
        JSON.parse(msg.content.toString()) as Payload,
        queueLogger.idTrace('Received message', 'payload'),
        (payload) => handler(payload, msg),
        TE.bimap(
          () => channel.nack(msg, false, !msg.fields.redelivered),
          () => channel.ack(msg),
        ),
        T.map(constVoid),
      )();

    return pipe(
      TE.tryCatch(
        () => channel.consume(queueName, handlerWrapper),
        queueLogger.idError('Failed to consume message', 'err'),
      ),
      TE.map(queueLogger.constInfo('Registered event handler')(constVoid())),
    );
  };
}
