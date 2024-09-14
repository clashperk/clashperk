import { RewriteFrames } from '@sentry/integrations';
import { Integrations, NodeOptions } from '@sentry/node';

export const sentryConfig: NodeOptions = {
  dsn: process.env.SENTRY,
  serverName: process.env.SERVICE_NAME ?? 'clashperk_bot',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.GIT_SHA,
  integrations: [
    new RewriteFrames({
      iteratee(frame) {
        if (frame.filename) {
          const filename = frame.filename.replace(process.cwd(), '');
          frame.filename = filename.replace(/\\/g, '/');
        }
        return frame;
      }
    }),
    new Integrations.Http({ tracing: false, breadcrumbs: false })
  ]
};
