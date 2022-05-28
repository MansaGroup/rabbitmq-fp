import { LoggerInMem } from '../../test/loggerInMem';

import { loggerToFpLogger } from './logger';

describe('loggerToFpLogger', () => {
  const testLoggerHaveMethod = (methodName: string) => {
    // G
    const logger = LoggerInMem();

    // W
    const fpLogger = loggerToFpLogger(logger);

    // T
    expect(fpLogger).toHaveProperty(methodName);
  };

  it.each(['idFatal', 'idError', 'idWarn', 'idInfo', 'idDebug', 'idTrace'])(
    'should add id-variant method %s',
    testLoggerHaveMethod,
  );

  it.each([
    'constFatal',
    'constError',
    'constWarn',
    'constInfo',
    'constDebug',
    'constTrace',
  ])('should add const-variant method %s', testLoggerHaveMethod);

  describe('id-variant methods', () => {
    it('should log with the given value as scope', () => {
      // G
      const logger = LoggerInMem();
      const infoFnMock = jest.spyOn(logger, 'info');
      const fpLogger = loggerToFpLogger(logger);
      const value = 42;

      // W
      fpLogger.idInfo('Something', 'value')(value);

      // T
      expect(infoFnMock).toHaveBeenCalledWith('Something', {
        value: 42,
      });
    });

    it('should return the given value', () => {
      // G
      const logger = LoggerInMem();
      const fpLogger = loggerToFpLogger(logger);
      const value = 42;

      // W
      const returnedValue = fpLogger.idInfo('Something', 'value')(value);

      // T
      expect(returnedValue).toBe(value);
    });
  });

  describe('const-variant methods', () => {
    it('should log with the given value as scope', () => {
      // G
      const logger = LoggerInMem();
      const infoFnMock = jest.spyOn(logger, 'info');
      const fpLogger = loggerToFpLogger(logger);
      const value = 42;
      const returnValue = 21;

      // W
      fpLogger.constInfo('Something', 'value')(returnValue)(value);

      // T
      expect(infoFnMock).toHaveBeenCalledWith('Something', {
        value: 42,
      });
    });

    it('should return the given value', () => {
      // G
      const logger = LoggerInMem();
      const fpLogger = loggerToFpLogger(logger);
      const value = 42;
      const returnValue = 21;

      // W
      const returnedValue = fpLogger.constInfo(
        'Something',
        'value',
      )(returnValue)(value);

      // T
      expect(returnedValue).toBe(returnValue);
    });
  });
});
