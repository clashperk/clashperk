import { Command } from '../../lib';
import { MessageEmbed, CommandInteraction } from 'discord.js';
import { BLUE_NUMBERS } from '../../util/Emojis';
import { Collections, WarType } from '../../util/Constants';
import { ClanWar } from 'clashofclans.js';
import { Util } from '../../util';
import moment from 'moment';

export default class MissedAttacksCommand extends Command {
	public constructor() {
		super('remaining', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: ['Remaining or missed clan war attacks.', '', 'Get War ID from `warlog` command.']
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; war_id?: number }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (args.war_id) return this.getWar(interaction, args.war_id, clan.tag);

		const embed = new MessageEmbed()
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
			embed.setDescription('Not in War');
			return interaction.editReply({ embeds: [embed] });
		}

		return this.sendResult(interaction, body);
	}

	private async getWar(interaction: CommandInteraction, id: number | string, tag: string) {
		const collection = this.client.db.collection(Collections.CLAN_WARS);
		const data =
			typeof id === 'string' && tag
				? await collection
						.find({
							$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
							warType: { $ne: WarType.CWL },
							state: 'warEnded'
						})
						.sort({ _id: -1 })
						.limit(1)
						.next()
				: typeof id === 'number'
				? await collection.findOne({ id })
				: null;

		if (!data) {
			return interaction.editReply('**No War found for the specified War ID.**');
		}

		const clan = data.clan.tag === tag ? data.clan : data.opponent;
		const opponent = data.clan.tag === tag ? data.opponent : data.clan;
		// @ts-expect-error
		return this.sendResult(interaction, { ...data, clan, opponent });
	}

	private sendResult(interaction: CommandInteraction, body: ClanWar & { id?: number }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		if (body.state === 'preparation') {
			embed.setDescription(
				[
					'**War Against**',
					`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
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
				`${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
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
					embed.description,
					'',
					`**${body.attacksPerMember} ${body.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
					...TwoRem.sort((a, b) => a.mapPosition - b.mapPosition).map((m) => `\u200e${BLUE_NUMBERS[m.mapPosition]} ${m.name}`)
				].join('\n')
			);
		}

		if (OneRem.length && body.attacksPerMember !== 1) {
			embed.setDescription(
				[
					embed.description,
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
