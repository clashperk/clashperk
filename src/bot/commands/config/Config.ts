import { CommandInteraction, HexColorString, MessageEmbed } from 'discord.js';
import { Command } from '../../lib';
import { Util } from '../../util';
import { Settings } from '../../util/Constants';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			category: 'config',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: ['Manage server configuration.']
			}
		});
	}

	public exec(interaction: CommandInteraction<'cached'>, args: { color_code?: string; events_channel?: string }) {
		if (args.color_code) {
			if (['reset', 'none'].includes(args.color_code)) {
				this.client.settings.delete(interaction.guild, Settings.COLOR);
			}
			this.client.settings.set(interaction.guild, Settings.COLOR, Util.resolveColor(args.color_code as HexColorString));
		}

		if (args.events_channel) {
			if (['reset', 'none'].includes(args.events_channel)) {
				this.client.settings.delete(interaction.guild, Settings.EVENTS_CHANNEL);
			} else if (/\d{17,19}/g.test(args.events_channel)) {
				const channel = this.client.channels.cache.get(args.events_channel.match(/\d{17,19}/g)![0]);
				if (!channel?.isText()) {
					return interaction.reply({
						content: 'Type of channel is not text.',
						ephemeral: true
					});
				}
				this.client.settings.set(interaction.guild, Settings.EVENTS_CHANNEL, channel.id);
			}
		}

		return this.fallback(interaction);
	}

	public fallback(interaction: CommandInteraction<'cached'>) {
		const color = this.client.settings.get<number>(interaction.guild, Settings.COLOR, null);

		const channelId = this.client.settings.get<string>(interaction.guild, Settings.EVENTS_CHANNEL, null);
		const channel = interaction.guild.channels.cache.get(channelId);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `Settings of ${interaction.guild.name}` })
			.addField('Prefix', '/')
			.addField('Patron', this.client.patrons.get(interaction.guild.id) ? 'Yes' : 'No')
			.addField('Color', color ? `#${color.toString(16).toUpperCase()}` : 'None')
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			.addField('Events Channel', channel ? channel.toString() : 'None');

		return interaction.reply({ embeds: [embed] });
	}
}
