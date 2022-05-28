import { ChannelWrapper } from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { constVoid, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { FpLogger } from '../support/logger';
import { ErrorEncoder, RabbitMQAdapter, RPCHandler } from '../types';

export function consumeRPC<Payload, ReplyPayload>(
  channel: ChannelWrapper,
  publish: RabbitMQAdapter['publish'],
  errorEncoder: ErrorEncoder,
  logger: FpLogger,
): (
  queueName: string,
  handler: RPCHandler<Payload, ReplyPayload>,
) => TE.TaskEither<unknown, void> {
  return (queueName, handler) => {
    const queueLogger = logger.child({ queue: queueName });

    const handlerWrapper = (msg: amqplib.ConsumeMessage): Promise<void> =>
      pipe(
        JSON.parse(msg.content.toString()) as Payload,
        queueLogger.idTrace('Received message', 'payload'),
        (payload) => handler(payload, msg),
        TE.mapLeft(errorEncoder.encode),
        T.chainFirst((either: E.Either<unknown, ReplyPayload>) =>
          publish('', msg.properties.replyTo, E.toUnion(either), {
            correlationId: msg.properties.correlationId,
          }),
        ),
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
      TE.map(queueLogger.constInfo('Registered RPC handler')(constVoid())),
    );
  };
}
