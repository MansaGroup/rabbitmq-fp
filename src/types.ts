import * as amqp from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import * as TE from 'fp-ts/TaskEither';

import { TimeoutError } from './errors';
import { Logger } from './support/logger';

export type RequestCallbackMap = Map<
  string,
  (msg: amqplib.ConsumeMessage) => void
>;

export type EventHandler<Payload> = (
  payload: Payload,
  message: amqplib.ConsumeMessage,
) => TE.TaskEither<unknown, void>;

export type RPCHandler<Payload, ReplyPayload> = (
  payload: Payload,
  message: amqplib.ConsumeMessage,
) => TE.TaskEither<unknown, ReplyPayload>;

export interface ErrorEncoder<ErrorPayload = unknown, ErrorType = unknown> {
  encode: (error: ErrorType) => ErrorPayload;
  decode: (payload: ErrorPayload) => ErrorType;
}

export interface RabbitMQAdapterOptions {
  logger: Logger;
  errorEncoder: ErrorEncoder;
}

export interface RabbitMQAdapter {
  channel: amqp.ChannelWrapper;
  close: TE.TaskEither<unknown, void>;

  consumeEvent<Message>(
    queueName: string,
    handler: EventHandler<Message>,
  ): TE.TaskEither<unknown, void>;

  consumeRPC<Message, Reply>(
    queueName: string,
    handler: RPCHandler<Message, Reply>,
  ): TE.TaskEither<unknown, void>;

  request<Payload, ReplyPayload>(
    exchange: string,
    routingKey: string,
    payload: Payload,
    timeout?: number,
    publishOptions?: amqp.Options.Publish,
  ): TE.TaskEither<TimeoutError | unknown, ReplyPayload>;

  publish<Payload>(
    exchange: string,
    routingKey: string,
    payload: Payload,
    publishOptions?: amqp.Options.Publish,
  ): TE.TaskEither<unknown, void>;
}
