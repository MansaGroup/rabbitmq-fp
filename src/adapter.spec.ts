import * as E from 'fp-ts/Either';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

import { getRabbitMQConnectionURI } from '../test/createRabbitMQContainer';
import { LoggerInMem } from '../test/loggerInMem';

import { createRabbitMQAdapter } from './adapter';
import * as SetupFn from './setup-fn';
import { ErrorEncoder, RabbitMQAdapter } from './types';

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};

const createAdapter = () => {
  const connectionUrl = getRabbitMQConnectionURI();
  const logger = LoggerInMem();
  const errorEncoder: ErrorEncoder = {
    encode: identity,
    decode: identity,
  };
  const setupFn: SetupFn.Fn = flow(
    TE.right,
    TE.chain(SetupFn.assertExchange(EXCHANGE)),
    TE.chain(SetupFn.assertQueue(QUEUE)),
    TE.chain(SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)),
  );

  return pipe(
    createRabbitMQAdapter(connectionUrl, setupFn, {
      logger,
      errorEncoder,
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

  describe('Events', () => {
    let adapter: RabbitMQAdapter;

    beforeEach(async () => {
      adapter = await pipe(
        createAdapter(),
        T.map((e) => E.toUnion(e) as RabbitMQAdapter),
      )();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it.todo('should catch when the connection is created');

    it.todo('should catch when the connection fails');

    it.todo('should catch when the connection disconnects');

    it.todo('should catch when the connection is errored');

    it.todo('should catch when the channel is errored');
  });
});
