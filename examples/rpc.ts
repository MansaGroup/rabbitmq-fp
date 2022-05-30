import { constVoid, flow, pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

import { Logger, SetupFn, createRabbitMQAdapter, RPCHandler } from '../src';

const EXCHANGE = 'my-exchange';
const ROUTING_KEY = 'my-routing-key';
const QUEUE = 'my-queue';

interface RequestPayload {
  id: string;
}

interface ReplyPayload {
  id: string;
  name: string;
}

const setupFn: SetupFn.Fn = flow(
  SetupFn.assertExchange(EXCHANGE),
  SetupFn.assertQueue(QUEUE),
  SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY),
);

const logger: Logger = {
  fatal: (msg, extra) => constVoid(),
  error: (msg, extra) => constVoid(),
  warn: (msg, extra) => constVoid(),
  info: (msg, extra) => constVoid(),
  debug: (msg, extra) => constVoid(),
  trace: (msg, extra) => constVoid(),
  child: (scope) => logger,
};

const consumer: RPCHandler<RequestPayload, ReplyPayload> = (payload) =>
  pipe(
    TE.right({
      id: payload.id,
      name: 'Bob',
    }),
  );

await pipe(
  createRabbitMQAdapter('amqp://username:password@host:port', setupFn, {
    logger,
  }),
  TE.chainFirst((adapter) => adapter.consumeRPC(QUEUE, consumer)),
  TE.chainFirst((adapter) =>
    pipe(
      adapter.request<RequestPayload, ReplyPayload>(EXCHANGE, ROUTING_KEY, {
        id: '12345678',
      }),
      TE.map((reply) => {
        console.log(reply.name);
        return reply;
      }),
    ),
  ),
  TE.map((adapter) => adapter.close()),
)();
