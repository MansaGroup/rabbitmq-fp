import * as amqp from 'amqp-connection-manager';
import * as E from 'fp-ts/Either';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../../test/createRabbitMQContainer';
import { RabbitMQAdapter } from '../types';

import { close as fnClose } from './close';

let connection: amqp.AmqpConnectionManager;
let channel: amqp.ChannelWrapper;
let close: RabbitMQAdapter['close'];

beforeAll(async () => {
  await purgeRabbitMQContainer();
  connection = amqp.connect(getRabbitMQConnectionURI());
  channel = connection.createChannel();
  await channel.waitForConnect();

  close = fnClose(connection);
});

afterAll(async () => {
  await channel.close();
  await connection.close();
});

it('should close the connection and channel', async () => {
  // G

  // W
  const result = await close();

  // T
  expect(E.isRight(result)).toBe(true);
  expect(channel['_channel']).toBeUndefined();
  expect(connection.isConnected()).toBe(false);
});
