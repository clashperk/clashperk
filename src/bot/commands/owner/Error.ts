import { captureException } from '@sentry/node';
import { Command } from '../../lib/index.js';

export default class ErrorCommand extends Command {
  public constructor() {
    super('error', {
      category: 'owner',
      clientPermissions: ['EmbedLinks', 'AttachFiles'],
      defer: false
    });
  }

  public run() {
    captureException(new Error(`Hello from Sentry [${Math.random().toFixed(2)}]`));
  }
}
