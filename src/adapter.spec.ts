import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { getRabbitMQConnectionURI } from '../test/createRabbitMQContainer';

import { createRabbitMQAdapter } from './adapter';
import * as SetupFn from './setup-fn';
import { Logger } from './support/logger';
import { RabbitMQAdapter } from './types';
import { waitForConnect } from './utils';

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};

const createAdapter = () => {
  const connectionUrl = getRabbitMQConnectionURI();
  const logger: Logger = {
    fatal: console.log,
    error: console.log,
    warn: console.log,
    info: console.log,
    debug: console.log,
    trace: console.log,
    child: () => logger,
  };
  const setupFn: SetupFn.Fn = flow(
    SetupFn.assertExchange(EXCHANGE),
    SetupFn.assertQueue(QUEUE),
    SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY),
  );

  return pipe(
    createRabbitMQAdapter(connectionUrl, setupFn, {
      logger,
    }),
    TE.chainFirst(waitForConnect),
  );
};

describe('createRabbitMQAdapter', () => {
  it('should create an adapter', async () => {
    // W
    const adapter = await createAdapter()();

    // T
    expect(E.isRight(adapter)).toBe(true);
    await (E.toUnion(adapter) as RabbitMQAdapter).close();
  });

  it('should create a direct reply queue consumer', async () => {
    // G
    const adapter = await pipe(
      createAdapter(),
      TE.chainFirst((adapter) => adapter.consumeRPC(QUEUE, flow(TE.right))),
      T.map((e) => E.toUnion(e) as RabbitMQAdapter),
    )();

    // W
    const reply = await adapter.request(EXCHANGE, ROUTING_KEY, PAYLOAD)();

    // T
    expect(E.isRight(reply)).toBe(true);
    await adapter.close();
  });
});
