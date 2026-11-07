"use strict";

const labels = {
  keyLength: 'sk_live_' + 'ouSqybnlFZCdHI6v9YCoLKZ5'.length,
  keyInitial: 'sk_live_' + 'RV1ch71M4JaAXQ7gONxCJHcc'.slice(0, 1),
  runtimeSuffix: (env) => "ghp_" + env.RELEASE_LABEL
};

module.exports = { labels };
