import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { DIRECT_REPLY_QUEUE_NAME } from '../constants';
import { TimeoutError } from '../errors';
import { FpLogger } from '../support/logger';
import { RabbitMQAdapter } from '../types';
import { getRandomUUID } from '../utils';

export type RequestCallbackMap = Map<
  string,
  (msg: amqplib.ConsumeMessage) => void
>;

const DEFAULT_RPC_TIMEOUT_MS = 1000 * 10;

function doesMessageContainsRpcError(msg: amqplib.ConsumeMessage): boolean {
  return (
    typeof msg.properties.headers['x-is-rpc-error'] === 'boolean' &&
    msg.properties.headers['x-is-rpc-error'] === true
  );
}

export function request<Payload, ReplyPayload>(
  requestCallbacks: RequestCallbackMap,
  publish: RabbitMQAdapter['publish'],
  logger: FpLogger,
): (
  exchange: string,
  routingKey: string,
  payload: Payload,
  timeout?: number,
  publishOptions?: amqplib.Options.Publish,
) => TE.TaskEither<TimeoutError | unknown, ReplyPayload> {
  return (
    exchange,
    routingKey,
    payload,
    timeout = DEFAULT_RPC_TIMEOUT_MS,
    publishOptions,
  ) => {
    const getCorrelationId = getRandomUUID();
    const race = T.getRaceMonoid<E.Either<unknown, ReplyPayload>>();

    const timeoutTask = (requestLogger: FpLogger) =>
      T.delay(timeout)(
        pipe(
          E.left(new TimeoutError(timeout)),
          E.map(
            requestLogger.idError(`Request timed out`, undefined, { timeout }),
          ),
          T.of,
        ),
      );

    const replyTask = (requestLogger: FpLogger, correlationId: string) =>
      TE.taskify<unknown, ReplyPayload>((cb) => {
        requestCallbacks.set(correlationId, (msg) =>
          pipe(
            T.of(JSON.parse(msg.content.toString())),
            T.map(requestLogger.idTrace('Received reply', 'payload')),
            T.map(
              (payload) =>
                !doesMessageContainsRpcError(msg)
                  ? cb(undefined, payload)
                  : cb(payload), // TODO: unwrap error
            ),
          )(),
        );
      })();

    return () => {
      const correlationId = getCorrelationId();
      const requestLogger = logger.child({
        exchange,
        routingKey,
        correlationId,
      });

      return pipe(
        publish(exchange, routingKey, payload, {
          ...publishOptions,
          correlationId: correlationId,
          replyTo: DIRECT_REPLY_QUEUE_NAME,
        }),
        TE.mapLeft((err) => err as Error),
        TE.chain(() =>
          race.concat(
            timeoutTask(requestLogger),
            replyTask(requestLogger, correlationId),
          ),
        ),
      )();
    };
  };
}
