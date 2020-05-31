const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['current-war', 'war', 'cw'],
			category: 'search',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about currentwar.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);
			// .setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('Private WarLog');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`, {
			method: 'GET',
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).then(res => res.json());

		if (body.state === 'notInWar') {
			embed.setDescription('Not in War');
			return message.util.send({ embed });
		}

		if (body.state === 'preparation') {
			embed.setDescription(`Preparation day against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'Preparation Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('Starts In', moment.duration(new Date(moment(body.startTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'inWar') {
			embed.setDescription(`Battle day against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'Battle Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
					`${emoji.fire} ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('End Time', moment.duration(new Date(moment(body.endTime).toDate()).getTime() - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'warEnded') {
			embed.setDescription(`War ended against **${body.opponent.name} (${body.opponent.tag})**`)
				.addField('War State', 'War Ended')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`${emoji.star} ${body.clan.stars} / ${body.opponent.stars}`,
					`${emoji.fire} ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}%`,
					`${emoji.attacksword} ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('War Ended', moment.duration(Date.now() - new Date(moment(body.endTime).toDate()).getTime()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		}

		embed.addField('Rosters', [
			`**${body.clan.name}**\u200b ${this.count(body.clan.members)}`,
			'',
			`**${body.opponent.name}**\u200b ${this.count(body.opponent.members)}`
		]);
		return message.util.send({ embed });
	}

	count(members) {
		let [TH13, TH12, TH11, TH10, TH09, TH08, TH07, TH06, TH05, TH04, TH03, TH02, TH01] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		for (const member of members) {
			const TownHAll = member.townhallLevel;
			if (TownHAll === 13) TH13++;
			if (TownHAll === 12) TH12++;
			if (TownHAll === 11) TH11++;
			if (TownHAll === 10) TH10++;
			if (TownHAll === 9) TH09++;
			if (TownHAll === 8) TH08++;
			if (TownHAll === 7) TH07++;
			if (TownHAll === 6) TH06++;
			if (TownHAll === 5) TH05++;
			if (TownHAll === 4) TH04++;
			if (TownHAll === 3) TH03++;
			if (TownHAll === 2) TH02++;
			if (TownHAll === 1) TH01++;
		}

		const townHalls = [
			{ level: 1, total: TH01 },
			{ level: 2, total: TH02 },
			{ level: 3, total: TH03 },
			{ level: 4, total: TH04 },
			{ level: 5, total: TH05 },
			{ level: 6, total: TH06 },
			{ level: 7, total: TH07 },
			{ level: 8, total: TH08 },
			{ level: 9, total: TH09 },
			{ level: 10, total: TH10 },
			{ level: 11, total: TH11 },
			{ level: 12, total: TH12 },
			{ level: 13, total: TH13 }
		].filter(townHall => townHall.total !== 0).reverse();
		const Avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + p.total, 0) || 0;
		const math = (TH13 * 13) + (TH12 * 12) + (TH11 * 11) + (TH10 * 10) + (TH09 * 9) + (TH08 * 8) + (TH07 * 7) + (TH06 * 6) + (TH05 * 5) + (TH04 * 4) + (TH03 * 3) + (TH02 * 2) + Number(TH01);
		const total = TH13 + TH12 + TH11 + TH10 + TH09 + TH08 + TH07 + TH06 + TH05 + TH04 + TH03 + TH02 + TH01;
		const avg = math / total || 0;

		return [`**(Avg: ${Avg.toFixed(2)})**`, this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${townHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n')].join('\n');
	}

	chunk(items = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}

module.exports = CurrentWarCommand;
