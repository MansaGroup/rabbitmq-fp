import * as amqp from 'amqp-connection-manager';
import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../../test/createRabbitMQContainer';
import { LoggerInMem } from '../../test/loggerInMem';
import { loggerToFpLogger } from '../support/logger';
import { RabbitMQAdapter } from '../types';

import { publish as fnPublish } from './publish';

const EXCHANGE = 'test';
const QUEUE = 'test.handle-foo-do-something';
const ROUTING_KEY = 'test.command.foo.do-something';

const PAYLOAD = {
  hello: 'world',
};

let connection: amqp.AmqpConnectionManager;
let channel: amqp.ChannelWrapper;
let publish: RabbitMQAdapter['publish'];
let publishSpy: jest.SpiedFunction<amqp.ChannelWrapper['publish']>;

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
    publish = fnPublish(channel, logger);

    publishSpy = jest.spyOn(channel, 'publish');
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });
};

describe('Happy Path', () => {
  createConnectionAndChannel();

  it('should publish a message to the correct exchange and routing key', async () => {
    // G

    // W
    const result = await publish(EXCHANGE, ROUTING_KEY, PAYLOAD)();

    // T
    expect(E.isRight(result));
    expect(publishSpy.mock.calls[0][0]).toBe(EXCHANGE);
    expect(publishSpy.mock.calls[0][1]).toBe(ROUTING_KEY);
  });

  it('should serialize the payload correctly', () => {
    // G

    // W
    const sentPayload = publishSpy.mock.calls[0][2];

    // T
    expect(sentPayload).toMatchObject(Buffer.from(JSON.stringify(PAYLOAD)));
  });

  it('should fill the contentType property', () => {
    // G

    // W
    const { contentType } = publishSpy.mock
      .calls[0][3] as amqplib.Options.Publish;

    // T
    expect(contentType).toBe('application/json');
  });

  it('should fill the messageId property', () => {
    // G

    // W
    const { messageId } = publishSpy.mock
      .calls[0][3] as amqplib.Options.Publish;

    // T
    expect(messageId).not.toBeEmpty();
  });
});
