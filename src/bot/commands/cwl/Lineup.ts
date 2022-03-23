import { MessageEmbed, CommandInteraction, MessageButton, MessageActionRow, MessageSelectMenu } from 'discord.js';
import { Clan, ClanWar, ClanWarLeagueGroup, ClanWarMember, Player, WarClan } from 'clashofclans.js';
import { EMOJIS, HERO_PETS, BLUE_NUMBERS, WHITE_NUMBERS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Util } from '../../util';

const states: Record<string, string> = {
	inWar: 'Battle Day',
	preparation: 'Preparation',
	warEnded: 'War Ended'
};

export default class CWLLineupCommand extends Command {
	public constructor() {
		super('cwl-lineup', {
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Lineup of the current/previous round.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply('**[504 Request Timeout] Your clan is still searching for opponent!**');
		}

		if (!body.ok) {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(interaction))
				.setAuthor({
					name: `${clan.name} (${clan.tag})`,
					iconURL: `${clan.badgeUrls.medium}`,
					url: `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.tag}`
				})
				.setThumbnail(clan.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return interaction.editReply({ embeds: [embed] });
		}

		return this.rounds(interaction, body, clan);
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clan: Clan) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter((d) => !d.warTags.includes('#0'));

		const chunks: { state: string; clan: WarClan; opponent: WarClan; round: number }[] = [];
		for (const { warTags } of rounds.slice(-2)) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					const round = rounds.findIndex((en) => en.warTags.includes(warTag)) + 1;
					chunks.push({ state: data.state, clan, opponent, round });
				}
			}
		}

		if (!chunks.length) return interaction.editReply('**[504 Request Timeout] Your clan is still searching for opponent!**');
		let data = chunks.find((ch) => ch.state === 'preparation') ?? chunks.slice(-1)[0];

		const embeds = await this.getComparisonLineup(data.state, data.round, data.clan, data.opponent);
		for (const embed of embeds) embed.setColor(this.client.embed(interaction));

		const CUSTOM_ID = {
			PLAYER: this.client.uuid(interaction.user.id),
			COMPARE: this.client.uuid(interaction.user.id),
			MENU: this.client.uuid(interaction.user.id)
		};

		const buttons = new MessageActionRow()
			.addComponents(new MessageButton().setCustomId(CUSTOM_ID.PLAYER).setLabel('Show Player List').setStyle('SECONDARY'))
			.addComponents(new MessageButton().setCustomId(CUSTOM_ID.COMPARE).setLabel('Compare').setStyle('SECONDARY').setDisabled(true));

		const menus = new MessageActionRow().addComponents(
			new MessageSelectMenu()
				.setCustomId(CUSTOM_ID.MENU)
				.setPlaceholder('Select War')
				.addOptions([
					{
						label: 'Preparation',
						value: 'preparation',
						description: 'Lineup for the preparation day.'
					},
					{
						label: 'Battle Day',
						value: 'inWar',
						description: 'Lineup for the battle day.'
					}
				])
				.setDisabled(chunks.length === 1)
		);

		const msg = await interaction.editReply({ embeds, components: [buttons, menus] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		let clicked = Boolean(false);
		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.PLAYER) {
				const embeds = this.getLineupList(data.state, data.round, { clan: data.clan, opponent: data.opponent });
				for (const embed of embeds) embed.setColor(this.client.embed(interaction));
				clicked = Boolean(true);
				buttons.components[0].setDisabled(true);
				buttons.components[1].setDisabled(false);
				return action.update({ embeds, components: [buttons, menus] });
			}

			if (action.customId === CUSTOM_ID.MENU && action.isSelectMenu()) {
				data = chunks.find((ch) => ch.state === action.values[0]) ?? chunks.slice(-1)[0];

				await action.deferUpdate();
				const embeds = clicked
					? this.getLineupList(data.state, data.round, { clan: data.clan, opponent: data.opponent })
					: await this.getComparisonLineup(data.state, data.round, data.clan, data.opponent);
				for (const embed of embeds) embed.setColor(this.client.embed(interaction));

				await action.editReply({ embeds });
			}

			if (action.customId === CUSTOM_ID.COMPARE) {
				await action.deferUpdate();
				const embeds = await this.getComparisonLineup(data.state, data.round, data.clan, data.opponent);
				for (const embed of embeds) embed.setColor(this.client.embed(interaction));
				clicked = Boolean(false);
				buttons.components[0].setDisabled(false);
				buttons.components[1].setDisabled(true);
				await action.editReply({ embeds, components: [buttons, menus] });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(CUSTOM_ID).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async rosters(clanMembers: ClanWarMember[], opponentMembers: ClanWarMember[]) {
		const clanPlayers: Player[] = await this.client.http.detailedClanMembers(clanMembers);
		const a = clanPlayers
			.filter((res) => res.ok)
			.map((m, i) => {
				const heroes = m.heroes.filter((en) => en.village === 'home');
				const pets = m.troops.filter((en) => en.village === 'home' && en.name in HERO_PETS);
				return {
					e: 0,
					m: i + 1,
					t: m.townHallLevel,
					p: pets.map((en) => en.level).reduce((prev, en) => en + prev, 0),
					h: heroes.map((en) => en.level).reduce((prev, en) => en + prev, 0)
					// .concat(...Array(4 - heroes.length).fill(' '))
				};
			});

		const opponentPlayers: Player[] = await this.client.http.detailedClanMembers(opponentMembers as any);
		const b = opponentPlayers
			.filter((res) => res.ok)
			.map((m, i) => {
				const heroes = m.heroes.filter((en) => en.village === 'home');
				const pets = m.troops.filter((en) => en.village === 'home' && en.name in HERO_PETS);
				return {
					e: 1,
					m: i + 1,
					t: m.townHallLevel,
					p: pets.map((en) => en.level).reduce((prev, en) => en + prev, 0),
					h: heroes.map((en) => en.level).reduce((prev, en) => en + prev, 0)
					// .concat(...Array(4 - heroes.length).fill(' '))
				};
			});

		return Util.chunk(
			[...a, ...b].sort((a, b) => a.e - b.e).sort((a, b) => a.m - b.m),
			2
		);
	}

	private async getComparisonLineup(state: string, round: number, clan: WarClan, opponent: WarClan) {
		const lineups = await this.rosters(
			clan.members.sort((a, b) => a.mapPosition - b.mapPosition),
			opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
		);
		const embed = new MessageEmbed();
		embed.setAuthor({ name: `\u200e${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

		embed.setDescription(
			[
				'**War Against**',
				`**\u200e${opponent.name} (${opponent.tag})**`,
				'',
				`\u200e${EMOJIS.HASH} \`TH HERO \u2002  \u2002 TH HERO \``,
				lineups
					.map((lineup, i) => {
						const desc = lineup.map((en) => `${this.pad(en.t, 2)} ${this.pad(en.h, 4)}`).join(' \u2002vs\u2002 ');
						return `${BLUE_NUMBERS[i + 1]} \`${desc} \``;
					})
					.join('\n')
			].join('\n')
		);
		embed.setFooter({ text: `Round #${round} (${states[state]})` });

		return [embed];
	}

	private getLineupList(state: string, round: number, data: { clan: WarClan; opponent: WarClan }) {
		const embeds = [
			new MessageEmbed()
				.setAuthor({
					name: `\u200e${data.clan.name} (${data.clan.tag})`,
					iconURL: data.clan.badgeUrls.medium,
					url: this.clanURL(data.clan.tag)
				})
				.setDescription(
					data.clan.members
						.sort((a, b) => a.mapPosition - b.mapPosition)
						.map((m, i) => `\u200e${WHITE_NUMBERS[i + 1]} [${m.name}](https://open.clashperk.com/${m.tag.replace('#', '')})`)
						.join('\n')
				)
				.setFooter({ text: `Round #${round} (${states[state]})` }),

			new MessageEmbed()
				.setAuthor({
					name: `\u200e${data.opponent.name} (${data.opponent.tag})`,
					iconURL: data.opponent.badgeUrls.medium,
					url: this.clanURL(data.opponent.tag)
				})
				.setDescription(
					data.opponent.members
						.sort((a, b) => a.mapPosition - b.mapPosition)
						.map((m, i) => `\u200e${WHITE_NUMBERS[i + 1]} [${m.name}](https://open.clashperk.com/${m.tag.replace('#', '')})`)
						.join('\n')
				)
				.setFooter({ text: `Round #${round} (${states[state]})` })
		];

		return embeds;
	}

	private pad(num: number, depth: number) {
		return num.toString().padStart(depth, ' ');
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}
}
