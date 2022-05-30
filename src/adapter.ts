import {
  connect as amqpConnect,
  ChannelWrapper,
  AmqpConnectionManager,
} from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import { constVoid, identity, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';

import { DIRECT_REPLY_QUEUE_NAME } from './constants';
import { close as fnClose } from './method/close';
import { consumeEvent as fnConsumeEvent } from './method/consume-event';
import { consumeRPC as fnConsumeRPC } from './method/consume-rpc';
import { publish as fnPublish } from './method/publish';
import { request as fnRequest, RequestCallbackMap } from './method/request';
import * as SetupFn from './setup-fn';
import { FpLogger, loggerToFpLogger } from './support/logger';
import { RabbitMQAdapter, RabbitMQAdapterOptions } from './types';

function startRPCConsumer(
  channel: ChannelWrapper,
  requestCallbacks: RequestCallbackMap,
  logger: FpLogger,
): (adapter: RabbitMQAdapter) => TE.TaskEither<unknown, void> {
  return () => {
    return pipe(
      TE.tryCatch(
        () =>
          channel.consume(
            DIRECT_REPLY_QUEUE_NAME,
            (msgNullable: amqplib.ConsumeMessage | null) =>
              pipe(
                msgNullable,
                O.fromNullable,
                O.match(constVoid, (msg) =>
                  pipe(
                    requestCallbacks.get(msg.properties.correlationId),
                    O.fromNullable,
                    O.map((callback) => callback(msg)),
                  ),
                ),
              ),
            {
              noAck: true,
            },
          ),
        identity,
      ),
      TE.bimap(
        logger.idInfo('Failed to start RPC consumer', 'err'),
        logger.constInfo('Started RPC consumer')(constVoid()),
      ),
    );
  };
}

/* istanbul ignore next: hard to test */
function setupEvents(
  logger: FpLogger,
  connection: AmqpConnectionManager,
  channel: ChannelWrapper,
): void {
  connection.on('connect', () => {
    logger.info('Connected to RabbitMQ');
  });

  connection.on('connectFailed', ({ err }) => {
    logger.error('Failed to connect to RabbitMQ', { err });
  });

  connection.on('disconnect', ({ err }) => {
    logger.error('Disconnected from RabbitMQ', { err });
  });

  connection.on('error', (err) => {
    logger.error('An error occured on RabbitMQ connection', { err });
  });

  channel.on('error', (err) => {
    logger.error('An error occured on RabbitMQ channel', { err });
  });
}

export function createRabbitMQAdapter(
  connectionUrl: string,
  setupFn: SetupFn.Fn,
  options: RabbitMQAdapterOptions,
): TE.TaskEither<unknown, RabbitMQAdapter> {
  return () => {
    const logger = loggerToFpLogger(options.logger);

    const connection = amqpConnect(connectionUrl);
    const channel = connection.createChannel({
      setup: (channel: amqplib.ConfirmChannel) => setupFn(TE.right(channel))(),
      confirm: true,
    });
    setupEvents(logger, connection, channel);

    const requestCallbacks: RequestCallbackMap = new Map();
    const publish = fnPublish(channel, logger);

    const adapter: RabbitMQAdapter = {
      channel,
      close: fnClose(connection),
      consumeEvent: fnConsumeEvent(channel, logger),
      consumeRPC: fnConsumeRPC(channel, publish, logger),
      request: fnRequest(requestCallbacks, publish, logger),
      publish,
    };

    return pipe(
      adapter,
      TE.right,
      TE.chainFirst(startRPCConsumer(channel, requestCallbacks, logger)),
    )();
  };
}
