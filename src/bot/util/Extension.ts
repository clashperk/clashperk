import { Collection, Snowflake, Structures } from 'discord.js';
import { CommandUtil } from './CommandUtil';

class ButtonInteraction extends Structures.get('ButtonInteraction') {
	public author = { id: this.user.id, tag: this.user.tag };
	public commandUtils = new Collection<Snowflake, CommandUtil>();
	public sweep = setInterval(this.sweepCommandUtil.bind(this), 5 * 60 * 1000);

	public get util() {
		if (this.commandUtils.has(this.id)) return this.commandUtils.get(this.id);
		const util = new CommandUtil(this);
		this.commandUtils.set(this.id, util);
		return util;
	}

	private sweepCommandUtil() {
		for (const commandUtil of this.commandUtils.values()) {
			const now = Date.now();
			const message = commandUtil.message;
			if ((now - message.createdTimestamp) > 5 * 60 * 1000) {
				this.commandUtils.delete(message.id);
			}
		}
	}
}

class CommandInteraction extends Structures.get('CommandInteraction') {
	public author = { id: this.user.id, tag: this.user.tag };
	public commandUtils = new Collection<Snowflake, CommandUtil>();
	public sweep = setInterval(this.sweepCommandUtil.bind(this), 5 * 60 * 1000);

	public get util() {
		if (this.commandUtils.has(this.id)) return this.commandUtils.get(this.id);
		const util = new CommandUtil(this);
		this.commandUtils.set(this.id, util);
		return util;
	}

	private sweepCommandUtil() {
		for (const commandUtil of this.commandUtils.values()) {
			const now = Date.now();
			const message = commandUtil.message;
			if ((now - message.createdTimestamp) > 5 * 60 * 1000) {
				this.commandUtils.delete(message.id);
			}
		}
	}
}

Structures.extend('ButtonInteraction', () => ButtonInteraction);
Structures.extend('CommandInteraction', () => CommandInteraction);
