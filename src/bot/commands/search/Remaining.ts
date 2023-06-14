import { EmbedBuilder, CommandInteraction, escapeMarkdown, User } from 'discord.js';
import { ClanWar, Player } from 'clashofclans.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { BLUE_NUMBERS } from '../../util/Emojis.js';
import { Collections, WarType } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class RemainingCommand extends Command {
	public constructor() {
		super('remaining', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: ['Remaining or missed clan war attacks.', '', 'Get War ID from `warlog` command.']
			},
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; war_id?: number; user?: User; player_tag?: string }
	) {
		if ((args.user || args.player_tag) && !interaction.isButton()) {
			const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
			if (args.player_tag && !player) return null;
			return this.forUsers(interaction, { user: args.user, player });
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (args.war_id) return this.getWar(interaction, args.war_id, clan.tag);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

		if (!clan.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				return this.handler.exec(interaction, this.handler.modules.get('cwl-attacks')!, { tag: clan.tag });
			}
			embed.setDescription('Private War Log');
			return interaction.editReply({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(clan.tag);
		if (!body.ok) {
			return interaction.editReply('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				return this.handler.exec(interaction, this.handler.modules.get('cwl-attacks')!, { tag: clan.tag });
			}
			embed.setDescription(this.i18n('command.lineup.not_in_war', { lng: interaction.locale }));
			return interaction.editReply({ embeds: [embed] });
		}

		return this.sendResult(interaction, body);
	}

	private async getWar(interaction: CommandInteraction, id: number | string, tag: string) {
		const collection = this.client.db.collection(Collections.CLAN_WARS);
		const data =
			id === 'last'
				? await collection
						.find({
							$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
							warType: { $ne: WarType.CWL },
							state: 'warEnded'
						})
						.sort({ _id: -1 })
						.limit(1)
						.next()
				: await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

		if (!data) {
			return interaction.editReply(this.i18n('command.remaining.no_war_id', { lng: interaction.locale }));
		}

		const clan = data.clan.tag === tag ? data.clan : data.opponent;
		const opponent = data.clan.tag === tag ? data.opponent : data.clan;
		// @ts-expect-error
		return this.sendResult(interaction, { ...data, clan, opponent });
	}

	private sendResult(interaction: CommandInteraction, body: ClanWar & { id?: number }) {
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		if (body.state === 'preparation') {
			embed.setDescription(
				[
					'**War Against**',
					`${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					'Preparation'
				].join('\n')
			);
			return interaction.editReply({ embeds: [embed] });
		}

		const [OneRem, TwoRem] = [
			body.clan.members.filter((m) => m.attacks && m.attacks.length === 1),
			body.clan.members.filter((m) => !m.attacks)
		];
		const endTime = new Date(moment(body.endTime).toDate()).getTime();

		embed.setDescription(
			[
				'**War Against**',
				`${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				`${body.state.replace(/warEnded/g, 'War Ended').replace(/inWar/g, 'Battle Day')}`,
				'',
				'**End Time**',
				`${Util.getRelativeTime(endTime)}`
			].join('\n')
		);
		if (TwoRem.length) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					`**${body.attacksPerMember} ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
					...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
				].join('\n')
			);
		}

		if (OneRem.length && body.attacksPerMember !== 1) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					`**1 ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attack**`,
					...OneRem.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
				].join('\n')
			);
		}

		if (body.id) embed.setFooter({ text: `War ID #${body.id}` });
		return interaction.editReply({ embeds: [embed] });
	}

	private async forUsers(interaction: CommandInteraction<'cached'>, { player, user }: { player?: Player | null; user?: User }) {
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(user!.id);

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.aggregate<ClanWar>([
				{
					$match: {
						endTime: {
							$gte: new Date()
						},
						$or: [{ 'clan.members.tag': { $in: playerTags } }, { 'opponent.members.tag': { $in: playerTags } }]
					}
				},
				{ $sort: { _id: -1 } }
			])
			.toArray();

		const players = [];
		for (const data of wars) {
			data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
			data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

			for (const tag of playerTags) {
				const __member = data.clan.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				const member =
					__member ?? data.opponent.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				if (!member) continue;

				const clan = __member ? data.clan : data.opponent;
				const attacks = member.attacks ?? [];
				if (attacks.length === data.attacksPerMember) continue;

				players.push({
					member,
					clan,
					attacksPerMember: data.attacksPerMember,
					state: data.state,
					endTime: new Date(data.endTime),
					remaining: data.attacksPerMember - attacks.length
				});
			}
		}

		const embed = new EmbedBuilder();
		embed.setColor(this.client.embed(interaction));
		embed.setTitle('Remaining clan war attacks');
		if (user && !player) embed.setAuthor({ name: `\u200e${user.displayName} (${user.id})`, iconURL: user.displayAvatarURL() });

		const remaining = players.reduce((a, b) => a + b.remaining, 0);
		players.slice(0, 25).map(({ member, clan, remaining, endTime }, i) => {
			embed.addFields({
				name: `${member.name} (${member.tag})`,
				value: [
					`${remaining} remaining in ${clan.name}`,
					`- ${Util.getRelativeTime(endTime.getTime())}`,
					i === players.length - 1 ? '' : '\u200b'
				].join('\n')
			});
		});
		embed.setFooter({ text: `${remaining} remaining ${Util.plural(remaining, 'attack')}` });

		return interaction.editReply({ embeds: [embed] });
	}
}
