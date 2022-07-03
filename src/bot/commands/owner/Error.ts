import { captureException } from '@sentry/node';
import { Command } from '../../lib';

export default class ErrorCommand extends Command {
	public constructor() {
		super('error', {
			category: 'owner',
			description: {
				content: "You can't use this anyway, so why explain?"
			},
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES']
		});
	}

	public run() {
		captureException(new Error(`Hello from Sentry [${Math.random().toFixed(2)}]`));
	}
}
