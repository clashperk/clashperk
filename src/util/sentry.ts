import * as Sentry from '@sentry/node';
import { NodeOptions, httpIntegration, rewriteFramesIntegration } from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const sentryConfig: NodeOptions = {
  dsn: process.env.SENTRY_DSN,
  serverName: process.env.SERVICE_NAME ?? 'clashperk_bot',
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.GIT_SHA,

  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  sendDefaultPii: true,
  profileLifecycle: 'trace',

  ignoreSpans: [{ op: /^(?!command_executed)/ }],

  beforeSendSpan(span) {
    return span;
  },

  beforeSendTransaction(event) {
    if (event.contexts?.trace?.op === 'command_executed') {
      return event;
    }
    return null;
  },

  integrations: [
    nodeProfilingIntegration(),
    rewriteFramesIntegration({
      iteratee(frame) {
        if (frame.filename) {
          const filename = frame.filename.replace(process.cwd(), '');
          frame.filename = filename.replace(/\\/g, '/');
        }
        return frame;
      }
    }),
    httpIntegration({
      breadcrumbs: false,
      disableIncomingRequestSpans: true,
      ignoreOutgoingRequests: (url) => {
        if (['https://gateway.discord.gg'].includes(new URL(url).origin)) {
          return true;
        }
        return false;
      }
    })
  ]
};

const sentry = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init(sentryConfig);
  }
};

export default sentry;
