import { EmbedBuilder, CommandInteraction, escapeMarkdown, User } from 'discord.js';
import { ClanWar } from 'clashofclans.js';
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

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; war_id?: number; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
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
}
