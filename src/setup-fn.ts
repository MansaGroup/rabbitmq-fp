import * as amqplib from 'amqplib';
import * as TE from 'fp-ts/TaskEither';

export type Fn = (
  channel: TE.TaskEither<unknown, amqplib.ConfirmChannel>,
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
  return TE.chainFirst((channel) =>
    tryCatchLike(
      () => channel.prefetch(count),
      (err) => err,
    ),
  );
}

export function assertExchange(
  exchange: string,
  type = 'topic',
  options: amqplib.Options.AssertExchange = {
    durable: true,
  },
): Fn {
  return TE.chainFirst((channel) =>
    tryCatchLike(
      () => channel.assertExchange(exchange, type, options),
      (err) => err,
    ),
  );
}

export function assertQueue(
  queue: string,
  options: amqplib.Options.AssertQueue = {
    durable: true,
  },
): Fn {
  return TE.chainFirst((channel) =>
    tryCatchLike(
      () => channel.assertQueue(queue, options),
      (err) => err,
    ),
  );
}

export function bindQueue(
  queue: string,
  exchange: string,
  routingKey: string,
): Fn {
  return TE.chainFirst((channel) =>
    tryCatchLike(
      () => channel.bindQueue(queue, exchange, routingKey),
      (err) => err,
    ),
  );
}
