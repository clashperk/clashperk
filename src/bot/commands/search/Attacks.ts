import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Command } from '../../lib';

export default class ClanAttacksCommand extends Command {
	public constructor() {
		super('attacks', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows attacks and defense of all members.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (clan.members < 1) return interaction.editReply(`\u200e**${clan.name}** does not have any clan members...`);

		const fetched = await this.client.http.detailedClanMembers(clan.memberList);
		const members = fetched
			.filter((res) => res.ok)
			.map((m) => ({
				name: m.name,
				tag: m.tag,
				attackWins: m.attackWins,
				defenseWins: m.defenseWins
			}));

		members.sort((a, b) => b.attackWins - a.attackWins);

		const getEmbed = () => {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(interaction))
				.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
				.setDescription(
					[
						'```',
						`\u200e ${'#'}  ${'ATK'}  ${'DEF'}  ${'NAME'.padEnd(15, ' ')}`,
						members
							.map((member, i) => {
								const name = `${member.name.replace(/\`/g, '\\').padEnd(15, ' ')}`;
								const attackWins = `${member.attackWins.toString().padStart(3, ' ')}`;
								const defenseWins = `${member.defenseWins.toString().padStart(3, ' ')}`;
								return `${(i + 1).toString().padStart(2, ' ')}  ${attackWins}  ${defenseWins}  \u200e${name}`;
							})
							.join('\n'),
						'```'
					].join('\n')
				);

			return embed;
		};

		const embed = getEmbed();

		const customId = this.client.uuid(interaction.user.id);
		const button = new MessageButton().setCustomId(customId).setStyle('SECONDARY').setLabel('Sort by Defense');
		const msg = await interaction.editReply({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });

		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customId && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.once('collect', async (action) => {
			members.sort((a, b) => b.defenseWins - a.defenseWins);
			await action.update({ embeds: [getEmbed()], components: [] });
		});

		collector.once('end', async (_, reason) => {
			this.client.components.delete(customId);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}
}
