import { Logger } from '../src/support/logger';

type LoggerInMem = Logger & {
  lines: string[];
  flush: () => void;
};

export function LoggerInMem(): LoggerInMem {
  let lines: string[] = [];

  const flush = () => {
    lines = [];
  };

  const log = (msg: string) => {
    lines.push(msg);
  };

  return {
    lines,
    flush,
    fatal: log,
    error: log,
    warn: log,
    info: log,
    debug: log,
    trace: log,
    child: () => LoggerInMem(),
  };
}
