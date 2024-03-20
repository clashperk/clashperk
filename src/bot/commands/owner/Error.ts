import { captureException } from '@sentry/node';
import { Command } from '../../lib/index.js';

export default class ErrorCommand extends Command {
	public constructor() {
		super('error', {
			category: 'owner',
			description: {
				content: "You can't use this anyway, so why explain?"
			},
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			defer: false
		});
	}

	public run() {
		captureException(new Error(`Hello from Sentry [${Math.random().toFixed(2)}]`));
	}
}
