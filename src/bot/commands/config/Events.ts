import { Message, TextChannel } from 'discord.js';
import { Argument, Command } from 'discord-akairo';
import { Settings } from '../../util/Constants';

export default class EventCommand extends Command {
	public constructor() {
		super('config-events', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: '',
				usage: '',
				examples: ['']
			}
		});
	}

	public *args(): unknown {
		const channel = yield {
			'match': 'content',
			'type': Argument.union(['none'], 'textChannel'),
			'default': (message: Message) => message.channel
		};

		return { channel };
	}

	public async exec(message: Message, { channel }: { channel: TextChannel | 'none' }) {
		if (channel === 'none') {
			this.client.settings.delete(message.guild!, Settings.EVENTS_CHANNEL);
			return message.util!.send('**Events channel deleted!**');
		}
		this.client.settings.set(message.guild!, Settings.EVENTS_CHANNEL, channel.id);
		return message.util!.send(`**Events channel set to ${channel.toString()}**`); // eslint-disable-line
	}
}
