type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

type ExtraData = Record<string, unknown>;
type LogFn = (msg: string, extra?: ExtraData) => void;
type StdLogger = Record<LogLevel, LogFn>;

export type Logger = StdLogger & {
  child: (scope: Record<string, unknown>) => Logger;
};

type IdLogFn = (
  msg: string,
  idKey?: string,
  extra?: ExtraData,
) => <T>(x: T) => T;
type IdLogger = Record<`id${Capitalize<LogLevel>}`, IdLogFn>;

type ConstLogFn = (
  msg: string,
  idKey?: string,
  extra?: ExtraData,
) => <T>(returnValue: T) => (x: unknown) => T;
type ConstLogger = Record<`const${Capitalize<LogLevel>}`, ConstLogFn>;

export type FpLogger = Omit<Logger, 'child'> &
  IdLogger &
  ConstLogger & {
    child: (scope: Record<string, unknown>) => FpLogger;
  };

function extraIfNotEmpty(extra: ExtraData): ExtraData | undefined {
  return Object.keys(extra).length > 0 ? extra : undefined;
}

const wrapIdLogFn: (fn: LogFn) => IdLogFn = (fn: LogFn) => {
  return (msg, idKey, extra) => {
    return (x) => {
      fn(
        msg,
        extraIfNotEmpty({
          ...extra,
          ...(idKey && {
            [idKey]: x,
          }),
        }),
      );
      return x;
    };
  };
};

const wrapConstLogFn: (fn: LogFn) => ConstLogFn = (fn: LogFn) => {
  return (msg, idKey, extra) => {
    return (id) => {
      return (x) => {
        fn(
          msg,
          extraIfNotEmpty({
            ...extra,
            ...(idKey && {
              [idKey]: x,
            }),
          }),
        );
        return id;
      };
    };
  };
};

export function loggerToFpLogger(logger: Logger): FpLogger {
  return {
    ...logger,
    idFatal: wrapIdLogFn(logger.fatal.bind(logger)),
    idError: wrapIdLogFn(logger.error.bind(logger)),
    idWarn: wrapIdLogFn(logger.warn.bind(logger)),
    idInfo: wrapIdLogFn(logger.info.bind(logger)),
    idDebug: wrapIdLogFn(logger.debug.bind(logger)),
    idTrace: wrapIdLogFn(logger.trace.bind(logger)),
    constFatal: wrapConstLogFn(logger.fatal.bind(logger)),
    constError: wrapConstLogFn(logger.error.bind(logger)),
    constWarn: wrapConstLogFn(logger.warn.bind(logger)),
    constInfo: wrapConstLogFn(logger.info.bind(logger)),
    constDebug: wrapConstLogFn(logger.debug.bind(logger)),
    constTrace: wrapConstLogFn(logger.trace.bind(logger)),
    child: (scope) => loggerToFpLogger(logger.child(scope)),
  };
}
