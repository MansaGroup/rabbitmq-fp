import * as amqp from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { identity, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import waitForExpect from 'wait-for-expect';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../../test/createRabbitMQContainer';
import { LoggerInMem } from '../../test/loggerInMem';
import { DIRECT_REPLY_QUEUE_NAME } from '../constants';
import { TimeoutError } from '../errors';
import { loggerToFpLogger } from '../support/logger';
import { ErrorEncoder, RabbitMQAdapter, RequestCallbackMap } from '../types';

import { publish as fnPublish } from './publish';
import { request as fnRequest } from './request';

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};
const REPLY_PAYLOAD = {
  ping: 'pong',
};
const ERROR_PAYLOAD = {
  error: true,
};

let connection: amqp.AmqpConnectionManager;
let channel: amqp.ChannelWrapper;
let request: RabbitMQAdapter['request'];

let requestCallbackMap: RequestCallbackMap;
let publishSpy: jest.Mock<
  ReturnType<RabbitMQAdapter['publish']>,
  Parameters<RabbitMQAdapter['publish']>
>;

const createConnectionAndChannel = () => {
  beforeAll(async () => {
    await purgeRabbitMQContainer();
    connection = amqp.connect(getRabbitMQConnectionURI());
    channel = connection.createChannel({
      setup: async (channel: amqplib.ConfirmChannel) => {
        await channel.assertExchange(EXCHANGE, 'topic');
        await channel.assertQueue(QUEUE);
        await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
      },
    });
    await channel.waitForConnect();

    const logger = loggerToFpLogger(LoggerInMem());
    const errorEncoder: ErrorEncoder = {
      encode: identity,
      decode: identity,
    };

    const publish = fnPublish(channel, logger);

    requestCallbackMap = new Map();
    publishSpy = jest.fn(publish);

    request = fnRequest(requestCallbackMap, publishSpy, errorEncoder, logger);
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });
};

const createConsumers = (
  requestFn: jest.Mock<Promise<void>, [amqplib.ConsumeMessage]>,
) => {
  beforeAll(async () => {
    await channel.consume(QUEUE, requestFn, {
      noAck: true,
    });

    await channel.consume(
      DIRECT_REPLY_QUEUE_NAME,
      (msg) =>
        pipe(
          requestCallbackMap.get(msg.properties.correlationId),
          O.fromNullable,
          O.map((fn) => fn(msg)),
        ),
      {
        noAck: true,
      },
    );
  });
};

describe('Happy Path', () => {
  const requestFn = (
    jest.fn() as jest.Mock<Promise<void>, [amqplib.ConsumeMessage]>
  ).mockImplementation(async (msg) => {
    await channel.publish(
      '',
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(REPLY_PAYLOAD)),
      {
        correlationId: msg.properties.correlationId,
      },
    );
  });

  let reply: E.Either<unknown, typeof REPLY_PAYLOAD>;

  createConnectionAndChannel();
  createConsumers(requestFn);

  it('should publish the request message to the correct exchange and routing key', async () => {
    // G

    // W
    reply = await request<typeof PAYLOAD, typeof REPLY_PAYLOAD>(
      EXCHANGE,
      ROUTING_KEY,
      PAYLOAD,
    )();

    // T
    await waitForExpect(
      async () => {
        expect(publishSpy).toHaveBeenCalled();
      },
      5000,
      1000,
    );
    expect(publishSpy.mock.calls[0][0]).toBe(EXCHANGE);
    expect(publishSpy.mock.calls[0][1]).toBe(ROUTING_KEY);
  });

  it('should publish the request message with a correlationId property', async () => {
    // G

    // W

    // T
    expect(publishSpy.mock.calls[0][3]).toHaveProperty('correlationId');
  });

  it('should resolves the reply', async () => {
    // G

    // W

    // T
    expect(E.isRight(reply)).toBe(true);
    expect(E.toUnion(reply)).toStrictEqual(REPLY_PAYLOAD);
  });
});

describe('Error Handling - Error reply', () => {
  const requestFn = (
    jest.fn() as jest.Mock<Promise<void>, [amqplib.ConsumeMessage]>
  ).mockImplementation(async (msg) => {
    await channel.publish(
      '',
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(ERROR_PAYLOAD)),
      {
        correlationId: msg.properties.correlationId,
        headers: { 'x-is-rpc-error': true },
      },
    );
  });

  createConnectionAndChannel();
  createConsumers(requestFn);

  it('should resolves a Left Either with the error received', async () => {
    // G

    // W
    const reply = await request<typeof PAYLOAD, typeof REPLY_PAYLOAD>(
      EXCHANGE,
      ROUTING_KEY,
      PAYLOAD,
    )();

    // T
    expect(E.isLeft(reply)).toBe(true);
    expect(E.toUnion(reply)).toStrictEqual(ERROR_PAYLOAD);
  });
});

describe('Error Handling - Timeout', () => {
  const requestFn = (
    jest.fn() as jest.Mock<Promise<void>, [amqplib.ConsumeMessage]>
  ).mockImplementation(() => Promise.resolve());

  createConnectionAndChannel();
  createConsumers(requestFn);

  it('should resolves a Left Either when the request times out', async () => {
    // G

    // W
    const reply = await request<typeof PAYLOAD, typeof REPLY_PAYLOAD>(
      EXCHANGE,
      ROUTING_KEY,
      PAYLOAD,
      50,
    )();

    // T
    expect(E.isLeft(reply)).toBe(true);
    expect(E.toUnion(reply)).toStrictEqual(new TimeoutError(50));
  });
});

describe('Error Handling - Publish error', () => {
  let publichMock: jest.SpiedFunction<amqp.ChannelWrapper['publish']>;

  createConnectionAndChannel();

  beforeAll(() => {
    publichMock = jest.spyOn(channel, 'publish');
  });

  it('should return a Left Either when failing to publish the request', async () => {
    // G
    publichMock.mockRejectedValue(new Error('Failed to publish'));

    // W
    const result = await request(EXCHANGE, ROUTING_KEY, PAYLOAD)();

    // T
    expect(E.isLeft(result));
    expect(E.toUnion(result)).toStrictEqual(new Error('Failed to publish'));
  });
});
