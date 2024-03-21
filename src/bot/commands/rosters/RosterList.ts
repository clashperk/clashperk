import { CommandInteraction, EmbedBuilder, User, escapeMarkdown } from 'discord.js';
import { Filter, WithId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { IRoster } from '../../struct/RosterManager.js';

export default class RosterListCommand extends Command {
	public constructor() {
		super('roster-list', {
			category: 'roster',
			channel: 'guild',
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { user?: User; player_tag?: string; name?: string; clan?: string }) {
		const query: Filter<IRoster> = { guildId: interaction.guild.id };

		if (args.user) query['members.userId'] = args.user.id;
		else if (args.player_tag) query['members.tag'] = args.player_tag;

		if (args.name) {
			const text = args.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			query.name = { $regex: `.*${text}.*`, $options: 'i' };
		}
		if (args.clan) query['clan.tag'] = args.clan;

		const isQuery = Object.keys(query).length > 1;
		const filter = args.user
			? { $filter: { input: '$members', as: 'member', cond: { $eq: ['$$member.userId', args.user.id] } } }
			: args.player_tag
			? { $filter: { input: '$members', as: 'member', cond: { $eq: ['$$member.tag', args.player_tag] } } }
			: null;

		const cursor = this.client.rosterManager.rosters.aggregate<WithId<IRoster & { memberCount: number }>>([
			{ $match: { ...query } },
			{
				$set: {
					...(filter ? { members: { ...filter } } : { members: [] }),
					memberCount: { $size: '$members' }
				}
			}
		]);
		if (!isQuery) cursor.sort({ _id: -1 });
		const rosters = await cursor.toArray();

		const embeds: EmbedBuilder[] = [];
		const rosterEmbed = new EmbedBuilder().setColor(this.client.embed(interaction)).setTitle('Rosters');
		if (rosters.length) {
			rosterEmbed.setDescription(
				rosters
					.map((roster, i) => {
						const closed = this.client.rosterManager.isClosed(roster) ? '[CLOSED] ' : '- ';
						const memberCount = `${roster.memberCount}/${roster.maxMembers ?? 50}`;
						return `**${i + 1}.** ${escapeMarkdown(`\u200e${roster.name} ${closed}${roster.clan.name} (${memberCount})`)}`;
					})
					.join('\n')
			);

			if (args.user) {
				const members = rosters
					.map((roster) =>
						roster.members.map((member) => ({
							name: member.name,
							tag: member.tag,
							userId: member.userId,
							username: member.username,
							townHallLevel: member.townHallLevel,
							roster: {
								name: roster.name,
								clan: roster.clan.name,
								memberCount: roster.memberCount,
								maxMembers: roster.maxMembers,
								isClosed: this.client.rosterManager.isClosed(roster)
							}
						}))
					)
					.flat();

				const membersMap = members.reduce<Record<string, Grouped>>((acc, member) => {
					acc[member.tag] = member;
					return acc;
				}, {});

				const grouped = members.reduce<Record<string, Grouped['roster'][]>>((acc, member) => {
					acc[member.tag] = [];
					acc[member.tag].push(member.roster);
					return acc;
				}, {});

				const groupedMembers = Object.values(membersMap).map((member) => {
					return {
						...member,
						rosters: grouped[member.tag]
					};
				});

				rosterEmbed.setDescription(
					groupedMembers
						.map((member) => {
							return [
								`- ${member.name} (${member.tag})`,
								...member.rosters.map((roster) => {
									const closed = roster.isClosed ? '[CLOSED] ' : '- ';
									const memberCount = `${roster.memberCount}/${roster.maxMembers ?? 50}`;
									return ` - ${escapeMarkdown(`\u200e${roster.name} ${closed}${roster.clan} (${memberCount})`)}`;
								})
							].join('\n');
						})
						.join('\n\n')
				);
				rosterEmbed.setTitle(`${args.user.displayName}'s Rosters`);
			}
		}

		if (isQuery) rosterEmbed.setFooter({ text: 'Search Results' });
		if (rosters.length) embeds.push(rosterEmbed);

		if (isQuery) {
			if (!embeds.length) return interaction.editReply({ content: 'No rosters found.' });
			return interaction.editReply({ embeds });
		}

		const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
		const groupEmbed = new EmbedBuilder().setColor(this.client.embed(interaction)).setTitle('User Groups');
		if (categories.length) {
			groupEmbed.setDescription(
				categories
					.map((category, i) => {
						return `**${i + 1}.** ${escapeMarkdown(category.displayName)} (${category.selectable ? 'Public' : 'Private'}) ${
							category.roleId ? `- <@&${category.roleId}>` : ''
						}`;
					})
					.join('\n')
			);
		}

		if (categories.length) embeds.push(groupEmbed);
		if (!embeds.length) return interaction.editReply({ content: 'No rosters or groups found.' });
		return interaction.editReply({ embeds });
	}
}

interface Grouped {
	name: string;
	tag: string;
	userId: string | null;
	username: string | null;
	townHallLevel: number;
	roster: {
		name: string;
		clan: string;
		memberCount: number;
		isClosed: boolean;
		maxMembers?: number;
	};
}
