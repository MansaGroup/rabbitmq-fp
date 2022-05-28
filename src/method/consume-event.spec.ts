import * as amqp from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { constVoid } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import waitForExpect from 'wait-for-expect';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../../test/createRabbitMQContainer';
import { LoggerInMem } from '../../test/loggerInMem';
import { loggerToFpLogger } from '../support/logger';
import { EventHandler, RabbitMQAdapter } from '../types';

import { consumeEvent as fnConsumeEvent } from './consume-event';

type EventHandlerMock<Payload> = jest.Mock<
  ReturnType<EventHandler<Payload>>,
  Parameters<EventHandler<Payload>>
>;

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};

let connection: amqp.AmqpConnectionManager;
let channel: amqp.ChannelWrapper;
let consumeEvent: RabbitMQAdapter['consumeEvent'];

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
    consumeEvent = fnConsumeEvent(channel, logger);
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
      jest.fn() as EventHandlerMock<typeof PAYLOAD>
    ).mockReturnValue(TE.right(constVoid()));

    // W
    await consumeEvent(QUEUE, handlerFn)();
    await channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(PAYLOAD)),
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
      jest.fn() as EventHandlerMock<typeof PAYLOAD>
    ).mockReturnValue(TE.left(new Error('Boum!')));

    // W
    await consumeEvent(QUEUE, handlerFn)();
    await channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(PAYLOAD)),
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
    const result = await consumeEvent(QUEUE, jest.fn())();

    // T
    expect(E.isLeft(result));
    expect(E.toUnion(result)).toStrictEqual(new Error('Failed to consume'));
  });
});
