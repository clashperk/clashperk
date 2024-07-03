import { captureException } from '@sentry/node';
import { Command } from '../../lib/index.js';

export default class ErrorCommand extends Command {
  public constructor() {
    super('error', {
      category: 'owner',
      ownerOnly: true,
      clientPermissions: ['EmbedLinks', 'AttachFiles'],
      defer: false
    });
  }

  public run() {
    try {
      // @ts-expect-error - test error
      foo(`Hello from Sentry [${Math.random().toFixed(2)}]`);
    } catch (e) {
      console.log(e);
      captureException(e);
    }
  }
}
