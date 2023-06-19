import Client from './Client.js';

export class CommandsMap {
	public commands: Map<string, string>;

	public constructor(private readonly client: Client) {
		this.commands = new Map();
	}

	public get() {
		return {
			SETUP_ENABLE: this.client.getCommand('/setup enable'),
			LINK_CREATE: this.client.getCommand('/link create'),
			REDEEM: this.client.getCommand('/redeem'),
			VERIFY: this.client.getCommand('/verify'),
			HISTORY: this.client.getCommand('/history')
		};
	}
}
