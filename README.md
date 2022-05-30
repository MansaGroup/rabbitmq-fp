![Banner](.github/assets/banner-thin.png)

<h1 align="center">RabbitMQ-fp</h1>
<p align="center">Lets feed our Rabbit' nicely 🐰</p>

<p align="center">
<img alt="License" title="License" src="https://img.shields.io/github/license/MansaGroup/rabbitmq-fp?style=flat-square"/>
<img alt="GitHub Issues" title="GitHub Issues" src="https://img.shields.io/github/issues/mansagroup/rabbitmq-fp?style=flat-square"/>
<img alt="GitHub Stars" title="GitHub Stars" src="https://img.shields.io/github/stars/MansaGroup/rabbitmq-fp?style=flat-square"/>
</p>

This repository contains a wrapper over `amqplib` written in Typescript
with an accent of functionnal programming, using `fp-ts`. It will handle
high-level features like RPC without hassle.

> **Warning**
> This library is still heavily being worked on, but no breaking changes
> on the API are planned.

**Feature highlights:**

- Built-in RPC support
- Functional typings with `fp-ts`
- Automatic error recovery using `amqp-connection-manager`

## Getting started

Install the package from npm:

```bash
npm install --save-exact @mansagroup/rabbitmq-fp
```

> This library has `fp-ts` as peer dependency, to match your project's
> version.

### Create a setup function

This library support automatic recovery on AMQP connection or channel
error. However, a newly created channel will not inherit the configuration
from the previous one. This means that each new channel must be
reconfigured (asserting exchanges, queues, binding queues, etc...).

To solve this, when creating an adapter, you must pass a setup function
which takes the created channel and returns this same channel. This can
easily represented as a `fp-ts`'s `flow` method:

```ts
import { flow } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { SetupFn } from '@mansagroup/rabbitmq-fp';

const setupFn: SetupFn.Fn = flow(
  SetupFn.assertExchange('my-exchange'),
  SetupFn.assertQueue('my-queue'),
  SetupFn.bindQueue('my-queue', 'my-exchange', 'my-routing-key'),
);
```

This function will be invoked every time a new channel is created.

### Create an adapter

An adapter is the actual brain of this library. It is the high-level
bridge between your code and the underlying `amqplib` library. It will
requires your previously created setup function but also a logger:

```ts
import { Logger, createRabbitMQAdapter } from '@mansagroup/rabbitmq-fp';

const logger: Logger = {
  info: (msg, extra) => {},
  // This for every log level
};

const adapter = await createRabbitMQAdapter(
  'amqp://username:password@host:port',
  setupFn,
  {
    logger,
  },
)();
```

### Create your consumer

To keep this simple, we will setup a simple event consumer which will
print `hello {greetings}` every time a message is published. A consumer
is a function which takes a _payload_ and returns a `TaskEither`.

> **Note**
> If the `TaskEither` is a `Left`, then the message will be `nack`,
> otherwise it will be `ack`.

```ts
import { EventHandler } from '@mansagroup/rabbitmq-fp';
import { pipe } from 'fp-ts/function';
import * as IO from 'fp-ts/IO';

interface Payload {
  greetings: string;
}

const consumer: EventHandler<Payload> = (payload) =>
  pipe(
    `hello ${payload.greetings}`,
    IO.of,
    IO.map(console.log),
    IO.map(TE.right),
  )();

await adapter.consumeEvent('my-queue', consumer)();
```

### Publish your message

Finally, after that your consumer is created and ready, you can publish
your first message to see the consumer invoked:

```ts
await adapter.publish<Payload>('my-exchange', 'my-routing-key', {
  greetings: 'Bob',
})();
```

### Everything together

Now, if we pull everything together, we could have a flow like the
one from the [`everything-together.ts` example](examples/everything-together.ts).

## License

This project is [MIT licensed](LICENSE.txt).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://jeremylvln.fr/"><img src="https://avatars.githubusercontent.com/u/6763873?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jérémy Levilain</b></sub></a><br /><a href="https://github.com/MansaGroup/rabbitmq-fp/commits?author=IamBlueSlime" title="Code">💻</a> <a href="https://github.com/MansaGroup/rabbitmq-fp/commits?author=IamBlueSlime" title="Documentation">📖</a> <a href="#ideas-IamBlueSlime" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
