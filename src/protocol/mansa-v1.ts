import * as E from 'fp-ts/Either';

import { getRandomUUID } from '../utils';

export interface Envelope<Payload> {
  uuid: string;
  type: string;
  version: number;
  emittedAt?: string;
  emittedBy?: string;
  payload: Payload;
}

export type ReplyEnvelope<ReplyPayload> =
  | {
      data: ReplyPayload;
    }
  | {
      error: {
        code: string;
        message: string;
      };
    };

export class AMQPError extends Error {
  private readonly isAMQPError = true;

  constructor(readonly code: string, readonly message: string) {
    super(message);
  }

  static isAMQPError(err: unknown): err is AMQPError {
    return (
      err !== null &&
      typeof err === 'object' &&
      Object.prototype.hasOwnProperty.apply(err, ['isAMQPError'])
    );
  }
}

export function createEnvelopeForPayload<Payload>(
  type: string,
  version: number,
  payload: Payload,
): Envelope<Payload> {
  return {
    uuid: getRandomUUID(),
    type,
    version,
    payload,
  };
}

export function createReplyEnvelopeForReply<ReplyPayload>(
  payload: ReplyPayload,
): ReplyEnvelope<ReplyPayload> {
  return {
    data: payload,
  };
}

export function createReplyEnvelopeForError(
  error: AMQPError,
): ReplyEnvelope<never> {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

export function decodeReplyEnvelope<ReplyPayload>(
  envelope: ReplyEnvelope<ReplyPayload>,
): E.Either<AMQPError, ReplyPayload> {
  return 'data' in envelope
    ? E.right(envelope.data)
    : E.left(new AMQPError(envelope.error.code, envelope.error.message));
}
