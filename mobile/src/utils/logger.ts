// Thin wrapper around console.* that is silenced in production builds.
// Use this everywhere instead of raw console calls so release APKs/IPAs
// emit no log output and no log data leaks to adb/console.

const noop = () => {};

export const logger = __DEV__
  ? {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    }
  : {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    };
