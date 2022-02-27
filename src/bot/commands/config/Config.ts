import { Message, TextChannel } from 'discord.js';
import { Argument, Command, PrefixSupplier } from 'discord-akairo';
import { Settings } from '../../util/Constants';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			aliases: ['config', 'settings'],
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: ['Manage server configuration.'],
				examples: [],
				usage: []
			},
			optionFlags: ['--color_code', '--events_channel']
		});
	}

	public *args(): unknown {
		const channel = yield {
			match: 'option',
			flag: '--events_channel',
			type: Argument.union(['none', 'reset'], 'textChannel')
		};

		const color = yield {
			'match': 'option',
			'flag': '--color_code',
			'type': Argument.union(['none', 'reset'], 'color'),
			'default': (message: Message) => this.client.embed(message)
		};

		return { color, channel };
	}

	public exec(message: Message, { color, channel }: { color?: number | string; channel?: TextChannel | string }) {
		if (color) {
			if (['reset', 'none'].includes(color as string)) {
				this.client.settings.delete(message.guild!, 'color');
				color = this.client.embed(message);
			}
			this.client.settings.set(message.guild!, 'color', color);
		}

		if (channel) {
			if (['reset', 'none'].includes(channel as string)) {
				this.client.settings.delete(message.guild!, Settings.EVENTS_CHANNEL);
			} else if (channel instanceof TextChannel) {
				this.client.settings.set(message.guild!, Settings.EVENTS_CHANNEL, channel.id);
			}
		}

		return this.fallback(message);
	}

	public async fallback(message: Message) {
		const color = this.client.settings.get<number>(message.guild!, Settings.COLOR, null);
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;

		const channelId = this.client.settings.get<string>(message.guild!, Settings.EVENTS_CHANNEL, null);
		const channel = message.guild!.channels.cache.get(channelId);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor({ name: `Settings of ${message.guild!.name}` })
			.addField('Prefix', prefix)
			.addField('Patron', this.client.patrons.get(message.guild!.id) ? 'Yes' : 'No')
			.addField('Color', color ? `#${color.toString(16).toUpperCase()}` : 'None')
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			.addField('Events Channel', channel ? channel.toString() : 'None');

		return message.util!.send({ embeds: [embed] });
	}
}
