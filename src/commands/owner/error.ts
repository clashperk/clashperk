import { Command } from '../../lib/handlers.js';

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
    // @ts-expect-error - test error
    foo(`Hello from Sentry [${Math.random().toFixed(2)}]`);
  }
}
