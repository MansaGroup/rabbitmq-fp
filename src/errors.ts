export class TimeoutError extends Error {
  private readonly isAMQPTimeoutError = true;

  constructor(readonly ms: number) {
    super(`Failed to receive response within timeout of ${ms}ms`);
  }

  static isTimeoutError(err: unknown): err is TimeoutError {
    return (
      err !== null &&
      typeof err === 'object' &&
      Object.prototype.hasOwnProperty.apply(err, ['isAMQPTimeoutError'])
    );
  }
}
