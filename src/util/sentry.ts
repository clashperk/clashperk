import * as Sentry from '@sentry/node';
import { httpIntegration, NodeOptions, rewriteFramesIntegration } from '@sentry/node';

const sentryConfig: NodeOptions = {
  dsn: process.env.SENTRY,
  serverName: process.env.SERVICE_NAME ?? 'clashperk_bot',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.GIT_SHA,
  integrations: [
    rewriteFramesIntegration({
      iteratee(frame) {
        if (frame.filename) {
          const filename = frame.filename.replace(process.cwd(), '');
          frame.filename = filename.replace(/\\/g, '/');
        }
        return frame;
      }
    }),
    httpIntegration({ breadcrumbs: false })
  ]
};

const sentry = () => {
  if (process.env.SENTRY) {
    Sentry.init(sentryConfig);
  }
};

export default sentry;
