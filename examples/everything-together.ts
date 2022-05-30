import { constVoid, flow, pipe } from 'fp-ts/function';
import * as IO from 'fp-ts/IO';
import * as TE from 'fp-ts/TaskEither';

import { Logger, EventHandler, SetupFn, createRabbitMQAdapter } from '../src';

const EXCHANGE = 'my-exchange';
const ROUTING_KEY = 'my-routing-key';
const QUEUE = 'my-queue';

interface Payload {
  greetings: string;
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

const consumer: EventHandler<Payload> = (payload) =>
  pipe(
    `hello ${payload.greetings}`,
    IO.of,
    IO.map(console.log),
    IO.map(TE.right),
  )();

await pipe(
  createRabbitMQAdapter('amqp://username:password@host:port', setupFn, {
    logger,
  }),
  TE.chainFirst((adapter) => adapter.consumeEvent(QUEUE, consumer)),
  TE.map((adapter) =>
    adapter.publish<Payload>(EXCHANGE, ROUTING_KEY, {
      greetings: 'Bob',
    }),
  ),
)();
