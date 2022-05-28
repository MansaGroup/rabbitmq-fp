import 'amqplib';

declare module 'amqplib' {
  export interface MessagePropertyHeaders {
    'x-is-rpc-error'?: boolean | undefined;
  }
}
