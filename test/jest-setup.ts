// eslint-disable-next-line @typescript-eslint/no-var-requires
// require('ts-node').register({ transpileOnly: true });

import { createRabbitMQContainer } from './createRabbitMQContainer';

export default async function () {
  console.log('Starting containers...');
  globalThis.__CONTAINERS__ = await Promise.all([createRabbitMQContainer()]);
}
