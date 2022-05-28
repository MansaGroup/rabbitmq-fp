import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';

import {
  getRabbitMQConnectionURI,
  purgeRabbitMQContainer,
} from '../test/createRabbitMQContainer';

import * as SetupFn from './setup-fn';

const EXCHANGE = 'my-exchange';
const QUEUE = 'my-queue';
const ROUTING_KEY = 'my-routing-key';

let connection: amqplib.Connection;
let channel: amqplib.ConfirmChannel;

const createConnectionAndChannel = () => {
  beforeEach(async () => {
    await purgeRabbitMQContainer();
    connection = await amqplib.connect(getRabbitMQConnectionURI());
    channel = await connection.createConfirmChannel();
  });

  afterEach(async () => {
    await channel.close();
    await connection.close();
  });
};

describe('prefetch', () => {
  createConnectionAndChannel();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed setting the prefetch count', async () => {
    // G
    const prefetchSpy: jest.SpiedFunction<amqplib.ConfirmChannel['prefetch']> =
      jest.spyOn(channel, 'prefetch');

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.prefetch(10)),
    )();

    // E
    expect(E.isRight(result));
    expect(prefetchSpy).toHaveBeenCalledWith(10);
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'prefetch').mockRejectedValue(error);

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.prefetch(10)),
    )();

    // T
    expect(E.isLeft(result)).toBe(true);
    expect(E.toUnion(result)).toStrictEqual(error);
  });
});

describe('assertExchange', () => {
  createConnectionAndChannel();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed asserting an exchange', async () => {
    // G
    const assertExchangeSpy: jest.SpiedFunction<
      amqplib.ConfirmChannel['assertExchange']
    > = jest.spyOn(channel, 'assertExchange');

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
    )();

    // E
    expect(E.isRight(result));
    expect(assertExchangeSpy).toHaveBeenCalledWith(EXCHANGE, 'direct', {
      durable: true,
    });
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'assertExchange').mockRejectedValue(error);

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
    )();

    // T
    expect(E.isLeft(result)).toBe(true);
    expect(E.toUnion(result)).toStrictEqual(error);
  });
});

describe('assertQueue', () => {
  createConnectionAndChannel();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed asserting a queue', async () => {
    // G
    const assertQueueSpy: jest.SpiedFunction<
      amqplib.ConfirmChannel['assertQueue']
    > = jest.spyOn(channel, 'assertQueue');

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
      TE.chain(SetupFn.assertQueue(QUEUE)),
    )();

    // E
    expect(E.isRight(result));
    expect(assertQueueSpy).toHaveBeenCalledWith(QUEUE, {
      durable: true,
    });
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'assertQueue').mockRejectedValue(error);

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
      TE.chain(SetupFn.assertQueue(QUEUE)),
    )();

    // T
    expect(E.isLeft(result)).toBe(true);
    expect(E.toUnion(result)).toStrictEqual(error);
  });
});

describe('bindQueue', () => {
  createConnectionAndChannel();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed binding a queue', async () => {
    // G
    const bindQueueSpy: jest.SpiedFunction<
      amqplib.ConfirmChannel['bindQueue']
    > = jest.spyOn(channel, 'bindQueue');

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
      TE.chain(SetupFn.assertQueue(QUEUE)),
      TE.chain(SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)),
    )();

    // E
    expect(E.isRight(result));
    expect(bindQueueSpy).toHaveBeenCalledWith(QUEUE, EXCHANGE, ROUTING_KEY);
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'bindQueue').mockRejectedValue(error);

    // W
    const result = await pipe(
      channel,
      TE.right,
      TE.chain(SetupFn.assertExchange(EXCHANGE)),
      TE.chain(SetupFn.assertQueue(QUEUE)),
      TE.chain(SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)),
    )();

    // T
    expect(E.isLeft(result)).toBe(true);
    expect(E.toUnion(result)).toStrictEqual(error);
  });
});
