import { CommandInteraction, MessageEmbed, MessageButton, MessageActionRow } from 'discord.js';
import { Command } from '../../lib';
import { Flags, Collections } from '../../util/Constants';
import { Util } from '../../util';

const names: Record<string, string> = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed',
	[Flags.CHANNEL_LINKED]: 'Linked Channel'
};

export default class SetupCommand extends Command {
	public constructor() {
		super('setup', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Enable features or assign clans to channels.'
			}
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { command: string }) {
		const command = {
			enable: this.handler.modules.get('setup-enable')!,
			disable: this.handler.modules.get('setup-disable')!
		}[args.command];
		if (command) {
			return this.handler.continue(interaction, command);
		}

		const CUSTOM_ID = {
			FEATURES: this.client.uuid(interaction.user.id),
			LIST: this.client.uuid(interaction.user.id)
		};
		const row = new MessageActionRow()
			.addComponents(new MessageButton().setCustomId(CUSTOM_ID.FEATURES).setStyle('PRIMARY').setLabel('Enabled Features'))
			.addComponents(new MessageButton().setCustomId(CUSTOM_ID.LIST).setStyle('PRIMARY').setLabel('Clan List'))
			.addComponents(new MessageButton().setURL('https://clashperk.com/guide').setStyle('LINK').setLabel('Guide'));

		await interaction.deferReply({ ephemeral: true });
		const msg = await interaction.editReply({
			content: ['**Follow the steps below to setup the bot.**'].join('\n'),
			components: [row],
			files: ['https://cdn.discordapp.com/attachments/765056295937114113/944927383012667472/unknown.png']
		});
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.FEATURES) {
				row.components[0].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getFeatures(interaction);
				if (!embeds.length) {
					await action.followUp({
						content: this.i18n('common.no_clans_linked', { lng: interaction.locale }),
						ephemeral: true
					});
					return;
				}

				for (const chunks of Util.chunk(embeds, 10)) {
					await action.followUp({ embeds: chunks, ephemeral: true });
				}
			}

			if (action.customId === CUSTOM_ID.LIST) {
				row.components[1].setDisabled(true);
				await action.update({ components: [row] });
				const embeds = await this.getClanList(interaction);
				if (!embeds.length) {
					await action.followUp({
						content: this.i18n('common.no_clans_linked', { lng: interaction.locale }),
						ephemeral: true
					});
					return;
				}

				await action.followUp({ embeds, ephemeral: true });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(CUSTOM_ID).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async getClanList(interaction: CommandInteraction) {
		const clans = await this.client.storage.findAll(interaction.guild!.id);
		const clanList = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
		if (!clans.length) return [];

		clanList.sort((a, b) => b.members - a.members);
		const nameLen = Math.max(...clanList.map((clan) => clan.name.length)) + 1;
		const tagLen = Math.max(...clanList.map((clan) => clan.tag.length)) + 1;
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Clans`, iconURL: interaction.guild!.iconURL()! })
			.setDescription(
				clanList
					.map(
						(clan) =>
							`\`\u200e${clan.name.padEnd(nameLen, ' ')} ${clan.tag.padStart(tagLen, ' ')}  ${clan.members
								.toString()
								.padStart(2, ' ')}/50 \u200f\``
					)
					.join('\n')
			);

		return [embed];
	}

	private async getFeatures(interaction: CommandInteraction) {
		const clans = await this.client.storage.findAll(interaction.guild!.id);
		const fetched = await Promise.all(
			clans.map(async (clan) => {
				const bit1 = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clan_id: clan._id });
				const bit2 = await this.client.db.collection(Collections.CLAN_FEED_LOGS).findOne({ clan_id: clan._id });
				const bit3 = await this.client.db.collection(Collections.LAST_SEEN_LOGS).findOne({ clan_id: clan._id });
				const bit4 = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clan_id: clan._id });
				const bit5 = await this.client.db.collection(Collections.CLAN_GAMES_LOGS).findOne({ clan_id: clan._id });
				const bit6 = await this.client.db.collection(Collections.CLAN_WAR_LOGS).findOne({ clan_id: clan._id });

				return {
					name: clan.name,
					tag: clan.tag,
					alias: clan.alias ? `(${clan.alias}) ` : '',
					roles: clan.role_ids?.map((id) => interaction.guild!.roles.cache.get(id)?.toString()) ?? [],
					channels: clan.channels?.map((id) => this.client.channels.cache.get(id)?.toString()) ?? [],
					entries: [
						{
							flag: Flags.DONATION_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit1?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_FEED_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							role: interaction.guild!.roles.cache.get(bit2?.role)?.toString(),
							channel: this.client.channels.cache.get(bit2?.channel)?.toString()
						},
						{
							flag: Flags.LAST_SEEN_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit3?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_EMBED_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit4?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_GAMES_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit5?.channel)?.toString()
						},
						{
							flag: Flags.CLAN_WAR_LOG,
							ok: Boolean(clan.flag > 0 && clan.active && !clan.paused),
							channel: this.client.channels.cache.get(bit6?.channel)?.toString()
						}
					]
				};
			})
		);

		return fetched.map((clan) => {
			const channels = clan.channels.filter((en) => en);
			const roles = clan.roles.filter((en) => en);
			const features = clan.entries; // .filter(en => en.ok && en.channel);

			const embed = new MessageEmbed();
			embed.setAuthor({ name: `\u200e${clan.name} (${clan.tag})` });
			if (channels.length) embed.setDescription(channels.join(', '));
			if (roles.length) {
				embed.addField('Roles', roles.join(' '), true);
			}
			if (features.length) {
				features.map((en) => embed.addField(names[en.flag], en.channel ? `${en.channel} ${en.role ?? ''}` : `-`, true));
			}

			return embed;
		});
	}
}
