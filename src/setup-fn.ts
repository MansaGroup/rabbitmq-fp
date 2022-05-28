import * as amqplib from 'amqplib';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';

export type Fn = (
  channel: amqplib.ConfirmChannel,
) => TE.TaskEither<unknown, amqplib.ConfirmChannel>;

function tryCatchLike<E, A>(
  supplier: () => PromiseLike<A>,
  onrejected: (reason: unknown) => E,
): TE.TaskEither<E, A> {
  return TE.tryCatch(
    () =>
      new Promise<A>((resolve, reject) => {
        return supplier().then(resolve, reject);
      }),
    onrejected,
  );
}

export function prefetch(count: number): Fn {
  return (channel) => {
    return pipe(
      tryCatchLike(
        () => channel.prefetch(count),
        (err) => err,
      ),
      TE.map(() => channel),
    );
  };
}

export function assertExchange(
  exchange: string,
  type = 'direct',
  options: amqplib.Options.AssertExchange = {
    durable: true,
  },
): Fn {
  return (channel) => {
    return pipe(
      tryCatchLike(
        () => channel.assertExchange(exchange, type, options),
        (err) => err,
      ),
      TE.map(() => channel),
    );
  };
}

export function assertQueue(
  queue: string,
  options: amqplib.Options.AssertQueue = {
    durable: true,
  },
): Fn {
  return (channel) => {
    return pipe(
      tryCatchLike(
        () => channel.assertQueue(queue, options),
        (err) => err,
      ),
      TE.map(() => channel),
    );
  };
}

export function bindQueue(
  queue: string,
  exchange: string,
  routingKey: string,
): Fn {
  return (channel) => {
    return pipe(
      tryCatchLike(
        () => channel.bindQueue(queue, exchange, routingKey),
        (err) => err,
      ),
      TE.map(() => channel),
    );
  };
}
