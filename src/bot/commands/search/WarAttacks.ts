import { Clan, CurrentWar, ClanWarMember, ClanWarClan, ClanWarOpponent } from 'clashofclans.js';
import { TOWN_HALLS, WAR_STARS } from '../../util/Emojis';
import { BROWN_NUMBERS, CYAN_NUMBERS } from '../../util/NumEmojis';
import { Command, PrefixSupplier } from 'discord-akairo';
import { MessageEmbed, Util, Message } from 'discord.js';
import 'moment-duration-format';
import moment from 'moment';

export default class CurrentWarCommand extends Command {
	public constructor() {
		super('war-attacks', {
			aliases: ['war-attacks'],
			category: 'beta',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info and stats about current war.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Private WarLog');
			}
			return message.util!.send({ embed });
		}

		const body: CurrentWar = await this.client.http.currentClanWar(data.tag);

		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag).catch(() => null);
			if (res?.ok) {
				embed.setDescription(`Clan is in CWL. Run \`${(this.handler.prefix as PrefixSupplier)(message) as string}cwl\` to get CWL commands.`);
			} else {
				embed.setDescription('Not in War');
			}
			return message.util!.send({ embed });
		}

		if (body.state === 'preparation') {
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation Day',
				`Starts in ${moment.duration(new Date(moment(body.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' })}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`
			]);
		}

		if (['warEnded', 'inWar'].includes(body.state)) {
			const attacks = this.getRecentAttacks(body.clan, body.opponent);
			const max = Math.max(...attacks.map(atk => atk.attacker.destructionPercentage));
			const pad = max === 100 ? 4 : 3;

			const description = attacks.map(({ attacker, defender }) => {
				const name = Util.escapeMarkdown(attacker.name);
				const stars = this.getStars(attacker.oldStars, attacker.stars);
				const destruction = Math.floor(attacker.destructionPercentage).toString().concat('%');
				return `${stars} \`\u200e${destruction.padStart(pad, ' ')}\` ${CYAN_NUMBERS[attacker.mapPosition]} ${BROWN_NUMBERS[attacker.townHallLevel]} ${'vs'} ${CYAN_NUMBERS[defender.mapPosition]} ${BROWN_NUMBERS[defender.townHallLevel]} ${name}`;
			}).join('\n');

			const chunks = Util.splitMessage(description);
			return chunks.map(async chunk => message.util!.send(chunk));
		}

		return message.util!.send({ embed });
	}

	private count(members: ClanWarMember[] = []) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: Number(entry[0]), total: Number(entry[1]) }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${TOWN_HALLS[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
	}

	private chunk(items: { level: number; total: number }[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private getStars(oldStars: number, newStars: number) {
		if (oldStars > newStars) {
			return [
				WAR_STARS.OLD.repeat(newStars),
				WAR_STARS.EMPTY.repeat(3 - newStars)
			].filter(stars => stars.length).join('');
		}
		return [
			WAR_STARS.OLD.repeat(oldStars),
			WAR_STARS.NEW.repeat(newStars - oldStars),
			WAR_STARS.EMPTY.repeat(3 - newStars)
		].filter(stars => stars.length).join('');
	}

	private getPreviousBestAttack(clan: ClanWarClan, defenderTag: string, attackerTag: string) {
		const attacks = clan.members.filter(mem => mem.attacks?.length)
			.map(mem => mem.attacks)
			.flat()
			.filter(atk => atk!.defenderTag === defenderTag && atk!.attackerTag !== attackerTag)
			.sort((a, b) => (b!.destructionPercentage ** b!.stars) - (a!.destructionPercentage ** a!.stars));
		return attacks[0];
	}

	private freshAttack(clan: ClanWarClan, defenderTag: string, order: number) {
		const attacks = clan.members.filter(mem => mem.attacks?.length)
			.map(mem => mem.attacks)
			.flat()
			.filter(atk => atk!.defenderTag === defenderTag)
			.sort((a, b) => a!.order - b!.order);
		return Boolean(attacks.length === 1 || attacks[0]!.order === order);
	}

	private getRecentAttacks(clan: ClanWarClan, opponent: ClanWarOpponent) {
		return clan.members.filter(mem => mem.attacks?.length)
			.map(mem => mem.attacks)
			.flat()
			.sort((a, b) => b!.order - a!.order)
			.slice(0, 30)
			.map(attack => {
				const previous = this.freshAttack(clan, attack!.defenderTag, attack!.order)
					? { stars: 0 }
					: this.getPreviousBestAttack(clan, attack!.defenderTag, attack!.attackerTag);
				const member = clan.members.find(mem => mem.tag === attack!.attackerTag)!;
				const defender = opponent.members.find(mem => mem.tag === attack!.defenderTag)!;
				return {
					attacker: {
						name: member.name,
						townHallLevel: member.townhallLevel,
						stars: attack!.stars,
						oldStars: previous!.stars,
						destructionPercentage: attack!.destructionPercentage,
						mapPosition: member.mapPosition
					},
					defender: {
						townHallLevel: defender.townhallLevel,
						mapPosition: defender.mapPosition
					}
				};
			});
	}
}
