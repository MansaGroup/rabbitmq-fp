import axios, { AxiosInstance } from 'axios';
import { GenericContainer, StoppedTestContainer } from 'testcontainers';

const RABBITMQ_IMAGE = 'rabbitmq:3-management-alpine';
const RABBITMQ_AMQP_PORT = 5672;
const RABBITMQ_HTTP_PORT = 15672;

export async function createRabbitMQContainer(): Promise<
  () => Promise<StoppedTestContainer>
> {
  const container = await new GenericContainer(RABBITMQ_IMAGE)
    .withStartupTimeout(300 * 1000)
    .withExposedPorts(RABBITMQ_AMQP_PORT, RABBITMQ_HTTP_PORT)
    .start();

  const connectionUri = `amqp://guest:guest@${container.getHost()}:${container.getMappedPort(
    RABBITMQ_AMQP_PORT,
  )}`;

  const apiBaseUrl = `http://guest:guest@${container.getHost()}:${container.getMappedPort(
    RABBITMQ_HTTP_PORT,
  )}/api`;

  process.env.__TEST_RABBITMQ_CONNECTION_URI__ = connectionUri;
  process.env.__TEST_RABBITMQ_API_BASE_URL__ = apiBaseUrl;

  return () => container.stop();
}

export async function purgeRabbitMQContainer(): Promise<void> {
  const apiClient = getRabbitMQApiClient();

  await apiClient
    .get<{ name: string; vhost: string }[]>(`/queues`)
    .then(({ data: queues }) =>
      Promise.all(
        queues.map((queue) =>
          apiClient.delete(
            `/queues/${encodeURIComponent(queue.vhost)}/${queue.name}`,
          ),
        ),
      ),
    );

  await apiClient
    .get<{ name: string; vhost: string }[]>(`/exchanges`)
    .then(({ data: exchanges }) =>
      Promise.all(
        exchanges
          .filter(
            (exchange) => exchange.name && !exchange.name.startsWith('amq.'),
          )
          .map((exchange) =>
            apiClient.delete(
              `/exchanges/${encodeURIComponent(exchange.vhost)}/${
                exchange.name
              }`,
            ),
          ),
      ),
    );
}

export function getRabbitMQConnectionURI(): string {
  return process.env.__TEST_RABBITMQ_CONNECTION_URI__ as string;
}

export function getRabbitMQApiClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.__TEST_RABBITMQ_API_BASE_URL__ as string,
  });
}
