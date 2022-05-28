import * as amqp from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import { ConsumeMessage } from 'amqplib';
import * as E from 'fp-ts/Either';
import { constVoid } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import waitForExpect from 'wait-for-expect';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../../test/createRabbitMQContainer';
import { LoggerInMem } from '../../test/loggerInMem';
import { DIRECT_REPLY_QUEUE_NAME } from '../constants';
import { loggerToFpLogger } from '../support/logger';
import { RabbitMQAdapter, RPCHandler } from '../types';
import { getRandomUUID } from '../utils';

import { consumeRPC as fnConsumeRPC } from './consume-rpc';

type RPCHandlerMock<Payload, ReplyPayload> = jest.Mock<
  ReturnType<RPCHandler<Payload, ReplyPayload>>,
  Parameters<RPCHandler<Payload, ReplyPayload>>
>;

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const CORRELATION_ID = getRandomUUID()();
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
let consumeRPC: RabbitMQAdapter['consumeRPC'];

let replyConsumer: jest.Mock<Promise<void>, [ConsumeMessage]>;
let publishMock: jest.Mock<
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

    replyConsumer = (jest.fn() as typeof replyConsumer).mockResolvedValue();
    await channel.consume(DIRECT_REPLY_QUEUE_NAME, replyConsumer, {
      noAck: true,
    });

    const logger = loggerToFpLogger(LoggerInMem());
    publishMock = (jest.fn() as typeof publishMock).mockReturnValue(
      TE.right(constVoid()),
    );

    consumeRPC = fnConsumeRPC(channel, publishMock, logger);
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });
};

describe('Happy Path', () => {
  let ackMock: jest.SpiedFunction<amqp.ChannelWrapper['ack']>;
  let receivedPayload: typeof PAYLOAD;

  createConnectionAndChannel();

  beforeAll(() => {
    ackMock = jest.spyOn(channel, 'ack');
  });

  it('should call the handler when a message is published', async () => {
    // G
    const handlerFn = (
      jest.fn() as RPCHandlerMock<typeof PAYLOAD, typeof REPLY_PAYLOAD>
    ).mockReturnValue(TE.right(REPLY_PAYLOAD));

    // W
    await consumeRPC(QUEUE, handlerFn)();
    await channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(PAYLOAD)),
      {
        correlationId: CORRELATION_ID,
        replyTo: DIRECT_REPLY_QUEUE_NAME,
      },
    );

    // T
    await waitForExpect(
      async () => {
        expect(handlerFn).toHaveBeenCalled();
      },
      5000,
      1000,
    );
    receivedPayload = handlerFn.mock.calls[0][0];
  });

  it('should deserialize the payload correctly', () => {
    // G

    // W

    // T
    expect(receivedPayload).toStrictEqual(PAYLOAD);
  });

  it('should reply the successful result of the handler', async () => {
    // G

    // W
    await waitForExpect(
      () => {
        expect(publishMock).toHaveBeenCalled();
      },
      5000,
      1000,
    );

    // T
    expect(publishMock).toHaveBeenCalledWith(
      '',
      expect.toStartWith(DIRECT_REPLY_QUEUE_NAME),
      REPLY_PAYLOAD,
      expect.objectContaining({
        correlationId: CORRELATION_ID,
      }),
    );
  });

  it('should ack the published message', () => {
    // G

    // W

    // T
    expect(ackMock).toHaveBeenCalledOnce();
  });
});

describe('Error Handling - Left returned by handler', () => {
  let nackMock: jest.SpiedFunction<amqp.ChannelWrapper['nack']>;

  createConnectionAndChannel();

  beforeAll(() => {
    nackMock = jest.spyOn(channel, 'nack');
  });

  it('should call the handler when a message is published', async () => {
    // G
    const handlerFn = (
      jest.fn() as RPCHandlerMock<typeof PAYLOAD, typeof REPLY_PAYLOAD>
    ).mockReturnValue(TE.left(ERROR_PAYLOAD));

    // W
    await consumeRPC(QUEUE, handlerFn)();
    await channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(PAYLOAD)),
      {
        correlationId: CORRELATION_ID,
        replyTo: DIRECT_REPLY_QUEUE_NAME,
      },
    );

    // T
    await waitForExpect(
      async () => {
        expect(handlerFn).toHaveBeenCalled();
      },
      5000,
      1000,
    );
  });

  it('should reply the errored result of the handler', async () => {
    // G

    // W
    await waitForExpect(
      () => {
        expect(publishMock).toHaveBeenCalled();
      },
      5000,
      1000,
    );

    // T
    expect(publishMock).toHaveBeenCalledWith(
      '',
      expect.toStartWith(DIRECT_REPLY_QUEUE_NAME),
      ERROR_PAYLOAD,
      expect.toBeObject(),
    );
  });

  it('should send the reply with the correlationId property', () => {
    // G

    // W

    // T
    expect(publishMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        correlationId: CORRELATION_ID,
      }),
    );
  });

  it('should send the reply with the x-is-rpc-error header', () => {
    // G

    // W

    // T
    expect(publishMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        headers: {
          'x-is-rpc-error': true,
        },
      }),
    );
  });

  it('should nack the published message', async () => {
    // G

    // W

    // T
    expect(nackMock).toHaveBeenCalled();
  });
});

describe('Error Handling - Consume error', () => {
  let consumeMock: jest.SpiedFunction<amqp.ChannelWrapper['consume']>;

  createConnectionAndChannel();

  beforeAll(() => {
    consumeMock = jest.spyOn(channel, 'consume');
  });

  it('should return a Left Either when failing to setup the consumer', async () => {
    // G
    consumeMock.mockRejectedValue(new Error('Failed to consume'));

    // W
    const result = await consumeRPC(QUEUE, jest.fn())();

    // T
    expect(E.isLeft(result));
    expect(E.toUnion(result)).toStrictEqual(new Error('Failed to consume'));
  });
});
