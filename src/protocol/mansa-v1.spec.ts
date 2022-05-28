import * as E from 'fp-ts/Either';

import {
  AMQPError,
  createEnvelopeForPayload,
  createReplyEnvelopeForError,
  createReplyEnvelopeForReply,
  decodeReplyEnvelope,
} from './mansa-v1';

describe('createEnvelopeForPayload', () => {
  const messageType = 'MyMessage';
  const messageVersion = 1;
  const message = {
    hello: 'world',
  };

  it('should set a random message UUID', () => {
    // G

    // W
    const envelope = createEnvelopeForPayload(
      messageType,
      messageVersion,
      message,
    );

    // T
    expect(envelope.uuid).not.toBeEmpty();
  });

  it('should set the message type', () => {
    // G

    // W
    const envelope = createEnvelopeForPayload(
      messageType,
      messageVersion,
      message,
    );

    // T
    expect(envelope.type).toBe(messageType);
  });

  it('should set the message version', () => {
    // G

    // W
    const envelope = createEnvelopeForPayload(
      messageType,
      messageVersion,
      message,
    );

    // T
    expect(envelope.version).toBe(messageVersion);
  });

  it('should set the message payload', () => {
    // G

    // W
    const envelope = createEnvelopeForPayload(
      messageType,
      messageVersion,
      message,
    );

    // T
    expect(envelope.payload).toStrictEqual(message);
  });
});

describe('createReplyEnvelopeForReply', () => {
  it('should set the data property', () => {
    // G

    // W
    const replyEnvelope = createReplyEnvelopeForReply({
      id: 1,
    });

    // T
    expect(replyEnvelope).toStrictEqual({
      data: {
        id: 1,
      },
    });
  });
});

describe('createReplyEnvelopeForError', () => {
  it('should set the error property', () => {
    // G

    // W
    const replyEnvelope = createReplyEnvelopeForError(
      new AMQPError('ERR_SOMETHING', 'Fail'),
    );

    // T
    expect(replyEnvelope).toStrictEqual({
      error: {
        code: 'ERR_SOMETHING',
        message: 'Fail',
      },
    });
  });
});

describe('AMQPError', () => {
  describe('isAMQPError', () => {
    it('should identify a AMQPError', () => {
      // G
      const error = new AMQPError('ERR_SOMETHING', 'Something');

      // W
      const is = AMQPError.isAMQPError(error);

      // T
      expect(is).toBeTrue();
    });

    it.each([null, 'string', new Error('A random error')])(
      'should not identify a AMQPError',
      (error) => {
        // G

        // W
        const is = AMQPError.isAMQPError(error);

        // T
        expect(is).toBeFalse();
      },
    );
  });
});

describe('decodeReplyEnvelope', () => {
  it('should decode as a Right with a reply payload', () => {
    // G
    const replyPayload = {};
    const replyEnvelope = createReplyEnvelopeForReply(replyPayload);

    // W
    const decoded = decodeReplyEnvelope(replyEnvelope);

    // T
    expect(E.isRight(decoded)).toBe(true);
    expect(E.toUnion(decoded)).toStrictEqual(replyPayload);
  });

  it('should decode as a Left with an error', () => {
    // G
    const error = new AMQPError('ERR_SOMETHING', 'No...');
    const replyEnvelope = createReplyEnvelopeForError(error);

    // W
    const decoded = decodeReplyEnvelope(replyEnvelope);

    // T
    expect(E.isLeft(decoded)).toBe(true);
    expect(E.toUnion(decoded)).toStrictEqual(error);
  });
});
