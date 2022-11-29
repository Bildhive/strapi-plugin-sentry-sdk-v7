'use strict';

module.exports = async () => {
  // Initialize the Sentry service exposed by this plugin
  const { sentry } = strapi.plugins['sentry-sdk-v7'].services;
  sentry.init();
};
