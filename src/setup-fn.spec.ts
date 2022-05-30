import * as amqplib from 'amqplib';
import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/lib/function';
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
    const fn: SetupFn.Fn = flow(SetupFn.prefetch(10));

    // W
    const result = await fn(TE.right(channel))();

    // E
    expect(E.isRight(result));
    expect(prefetchSpy).toHaveBeenCalledWith(10);
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'prefetch').mockRejectedValue(error);
    const fn: SetupFn.Fn = flow(SetupFn.prefetch(10));

    // W
    const result = await fn(TE.right(channel))();

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
    const fn: SetupFn.Fn = flow(SetupFn.assertExchange(EXCHANGE));

    // W
    const result = await fn(TE.right(channel))();

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
    const fn: SetupFn.Fn = flow(SetupFn.assertExchange(EXCHANGE));

    // W
    const result = await fn(TE.right(channel))();

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
    const fn: SetupFn.Fn = flow(
      SetupFn.assertExchange(EXCHANGE),
      SetupFn.assertQueue(QUEUE),
    );

    // W
    const result = await fn(TE.right(channel))();

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
    const fn: SetupFn.Fn = flow(
      SetupFn.assertExchange(EXCHANGE),
      SetupFn.assertQueue(QUEUE),
    );

    // W
    const result = await fn(TE.right(channel))();

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
    const fn: SetupFn.Fn = flow(
      SetupFn.assertExchange(EXCHANGE),
      SetupFn.assertQueue(QUEUE),
      SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY),
    );

    // W
    const result = await fn(TE.right(channel))();

    // E
    expect(E.isRight(result));
    expect(bindQueueSpy).toHaveBeenCalledWith(QUEUE, EXCHANGE, ROUTING_KEY);
  });

  it('should returns a Left when an error occurs', async () => {
    // G
    const error = new Error('Failed');
    jest.spyOn(channel, 'bindQueue').mockRejectedValue(error);
    const fn: SetupFn.Fn = flow(
      SetupFn.assertExchange(EXCHANGE),
      SetupFn.assertQueue(QUEUE),
      SetupFn.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY),
    );

    // W
    const result = await fn(TE.right(channel))();

    // T
    expect(E.isLeft(result)).toBe(true);
    expect(E.toUnion(result)).toStrictEqual(error);
  });
});
