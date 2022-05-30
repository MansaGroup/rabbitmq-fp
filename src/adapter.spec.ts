import * as E from 'fp-ts/Either';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { getRabbitMQConnectionURI } from '../test/createRabbitMQContainer';
import { LoggerInMem } from '../test/loggerInMem';

import { createRabbitMQAdapter } from './adapter';
import * as SetupFn from './setup-fn';
import { RabbitMQAdapter } from './types';

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};

const createAdapter = () => {
  const connectionUrl = getRabbitMQConnectionURI();
  const logger = LoggerInMem();
  const setupFn: SetupFn.Fn = flow(
    SetupFn.assertExchange(EXCHANGE),
    SetupFn.assertQueue(QUEUE),
    SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY),
  );

  return pipe(
    createRabbitMQAdapter(connectionUrl, setupFn, {
      logger,
    }),
    TE.chainFirst((adapter) =>
      TE.tryCatch(() => adapter.channel.waitForConnect(), identity),
    ),
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
      T.map((e) => E.toUnion(e) as RabbitMQAdapter),
      T.chainFirst((adapter) => adapter.consumeRPC(QUEUE, flow(TE.right))),
    )();

    // W
    const reply = await pipe(
      adapter.request(EXCHANGE, ROUTING_KEY, PAYLOAD),
      T.delay(3000),
    )();

    // T
    expect(E.isRight(reply)).toBe(true);
    await adapter.close();
  });
});
