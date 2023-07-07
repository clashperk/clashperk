import { Message } from 'discord.js';
import { Command } from '../../lib/index.js';
import { welcomeEmbedMaker } from '../../util/Helper.js';

export default class PingCommand extends Command {
	public constructor() {
		super('welcome', {
			category: 'none',
			description: {
				content: 'Pings me!'
			}
			// ownerOnly: true
		});
	}

	public async run(message: Message) {
		return message.channel.send({
			embeds: [welcomeEmbedMaker()]
		});
	}
}
