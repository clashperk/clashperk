import { Message } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class MessageListener extends Listener {
	public constructor() {
		super('messageCreate', {
			event: 'messageCreate',
			emitter: 'client',
			category: 'client'
		});
	}

	public async exec(message: Message) {
		if (!message.guild) return;
		if (message.author.bot) return;
		this.client.stats.message(message.guild.id);

		if (message.channel.type === 'DM') return;
		if (this.inhibitor(message)) return;
		if (message.channel.isThread() && !message.channel.permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS')) return;
		if (!message.channel.permissionsFor(this.client.user!)?.has(['SEND_MESSAGES', 'VIEW_CHANNEL'])) return;

		const prefix = this.client.settings.get<string>(message.guild.id, Settings.PREFIX, '!');
		const lowerContent = message.content.toLowerCase();
		if (!lowerContent.startsWith(prefix.toLowerCase())) return;

		const endOfPrefix = lowerContent.indexOf(prefix.toLowerCase()) + prefix.length;
		const startOfArgs = message.content.slice(endOfPrefix).search(/\S/) + prefix.length;
		const alias = message.content.slice(startOfArgs).split(/\s{1,}|\n{1,}/)[0];

		const command = this.client.commandHandler.modules.get(alias);
		const content = message.content.slice(startOfArgs + alias.length + 1).trim();
		const contents = content.split(/\s+/g);

		if (!command) return;
		if (!this.client.isOwner(message.author.id)) {
			return this.client.logger.log(`${command.id} ~ text-command`, { label: `${message.guild.name}/${message.author.tag}` });
		}

		try {
			const args = command.args();
			const resolved: Record<string, string> = {};
			const keys = Object.keys(args);
			keys.forEach((key, index) => (resolved[key] = contents[index]));
			if (!keys.length) resolved.content = content;

			this.client.logger.debug(`${command.id}`, { label: `${message.guild.name}/${message.author.tag}` });
			await command.run(message, resolved);
		} catch (error) {
			this.client.logger.error(`${command.id} ~ ${error as string}`, { label: `${message.guild.name}/${message.author.tag}` });
			console.error(error);
			await message.channel.send('**Something went wrong while executing that command.**');
		}
	}

	private inhibitor(message: Message) {
		const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		return guilds.includes(message.guild!.id) || users.includes(message.author.id);
	}
}
