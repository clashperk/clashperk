import { Listener } from 'discord-akairo';

export default class ReadyListener extends Listener {
	public constructor() {
		super('ready', {
			event: 'ready',
			emitter: 'client',
			category: 'client'
		});
	}

	public exec() {
		this.client.logger.info(
			`${this.client.user!.tag} (${this.client.user!.id}) [${(process.env.NODE_ENV ?? 'development').toUpperCase()}]`,
			{ label: 'READY' }
		);
	}
}
