import { CommandInteraction, HexColorString, EmbedBuilder, resolveColor } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';

export default class ConfigCommand extends Command {
	public constructor() {
		super('config', {
			category: 'config',
			clientPermissions: ['EmbedLinks'],
			channel: 'guild',
			description: {
				content: ['Manage server configuration.']
			}
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { color_code?: string; events_channel?: string; webhook_limit?: number }
	) {
		if (args.color_code) {
			if (['reset', 'none'].includes(args.color_code)) {
				await this.client.settings.delete(interaction.guild, Settings.COLOR);
			}
			await this.client.settings.set(interaction.guild, Settings.COLOR, this.getColor(args.color_code));
		}

		if (args.webhook_limit) {
			const webhookLimit = Math.max(3, Math.min(8, args.webhook_limit));
			await this.client.settings.set(interaction.guild, Settings.WEBHOOK_LIMIT, webhookLimit);
		}

		if (args.events_channel) {
			if (['reset', 'none'].includes(args.events_channel)) {
				await this.client.settings.delete(interaction.guild, Settings.EVENTS_CHANNEL);
			} else if (/\d{17,19}/g.test(args.events_channel)) {
				const channel = this.client.util.hasPermissions(args.events_channel.match(/\d{17,19}/g)!.at(0)!, [
					'ManageWebhooks',
					'ViewChannel'
				]);
				if (!channel) {
					return interaction.reply({
						content: this.i18n('command.config.no_text_channel', { lng: interaction.locale }),
						ephemeral: true
					});
				}
				await this.client.settings.set(interaction.guild, Settings.EVENTS_CHANNEL, channel.channel.id);
			}
		}

		return this.fallback(interaction);
	}

	public fallback(interaction: CommandInteraction<'cached'>) {
		const color = this.client.settings.get<number>(interaction.guild, Settings.COLOR, null);
		const channel = interaction.guild.channels.cache.get(
			this.client.settings.get<string>(interaction.guild, Settings.EVENTS_CHANNEL, null)
		);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: this.i18n('command.config.title', { lng: interaction.locale }) })
			.addFields([
				{
					name: 'Prefix',
					value: '/'
				},
				{
					name: 'Patron',
					value: this.client.patrons.get(interaction.guild.id) ? 'Yes' : 'No'
				},
				{
					name: 'Webhook Limit',
					value: `${this.client.settings.get<string>(interaction.guild, Settings.WEBHOOK_LIMIT, 8)}`
				},
				{
					name: this.i18n('common.color_code', { lng: interaction.locale }),
					value: color ? `#${color.toString(16).toUpperCase()}` : 'None'
				},
				{
					name: this.i18n('command.config.events_channel', { lng: interaction.locale }),
					value: channel?.toString() ?? 'None'
				}
			]);

		return interaction.reply({ embeds: [embed] });
	}

	private getColor(hex: string) {
		try {
			return resolveColor(hex as HexColorString);
		} catch {
			return null;
		}
	}
}
