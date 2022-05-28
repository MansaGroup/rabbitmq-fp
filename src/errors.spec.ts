import { TimeoutError } from './errors';

describe(TimeoutError.name, () => {
  describe(TimeoutError.isTimeoutError.name, () => {
    it('should identify a TimeoutError', () => {
      // G
      const error = new TimeoutError(10000);

      // W
      const is = TimeoutError.isTimeoutError(error);

      // T
      expect(is).toBeTrue();
    });

    it.each([null, 'string', new Error('A random error')])(
      'should not identify a TimeoutError',
      (error) => {
        // G

        // W
        const is = TimeoutError.isTimeoutError(error);

        // T
        expect(is).toBeFalse();
      },
    );
  });
});
