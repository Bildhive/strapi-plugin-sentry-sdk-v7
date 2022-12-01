'use strict';

module.exports = strapi => ({
  beforeInitialize() {
    strapi.config.middleware.load.after.unshift('sentry');
  },
  initialize() {
    const { sentry } = strapi.plugins['sentry-sdk-v7'].services;
    sentry.init();
    
    const settings = sentry.getSettings();

    strapi.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        let errorStatusCode;
        
        if (error.isBoom) {
          errorStatusCode = (error.output && error.output.statusCode) || null;
        }

        if (! errorStatusCode) {
          errorStatusCode = error.statusCode;
        }
        
        if (settings.skipStatusRange && settings.skipStatusRange.length) {
          for (const [start, end] of settings.skipStatusRange) {
            if (errorStatusCode >= start && errorStatusCode <= end) {
              throw error;
            }
          }
        }

        sentry.sendError(error, (scope, sentryInstance) => {
          scope.addEventProcessor(event => {
            // Parse Koa context to add error metadata
            return sentryInstance.Handlers.parseRequest(event, ctx.request, {
              // Don't parse the transaction name, we'll do it manually
              transaction: false,
            });
          });
          // Manually add transaction name
          scope.setTag('transaction', `${ctx.method} ${ctx.request.url}`);
          // Manually add Strapi version
          scope.setTag('strapi_version', strapi.config.info.strapi);
          scope.setTag('method', ctx.method);

          // Add http details
          scope.setTag('status_code', error.statusCode);
        });
        throw error;
      }
    });
  },
});
