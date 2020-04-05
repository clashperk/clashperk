const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const moment = require('moment');
const { oneLine } = require('common-tags');
const { MessageEmbed } = require('discord.js');
const { geterror, fetcherror, TownHallEmoji } = require('../../util/constants');
const { firestore } = require('../../struct/Database');

class CwlRoundComamnd extends Command {
	constructor() {
		super('cwl-round', {
			aliases: ['cwl-round', 'cwl-war'],
			category: 'cwl',
			description: {
				content: 'Shows info about current cwl war.',
				usage: '<tag> [--round/-r] [round]',
				examples: ['#8QU8J9LP', '#8QU8J9LP -r 5', '#8QU8J9LP --round 4'],
				fields: [
					{
						name: 'Flags',
						value: [
							'`--round <num>` or `-r <num>` to see specific round.'
						]
					}
				]
			},
			optionFlags: ['--round', '-r']
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 2000;
		return 15000;
	}

	*args() {
		const round = yield {
			match: 'option',
			flag: ['--round', '-r'],
			type: Argument.range('integer', 1, Infinity, true)
		};

		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.clan(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data.clan) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data.clan).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};

		return { data, round };
	}

	async exec(message, { data, round }) {
		await message.util.send('**Fetching data... <a:loading:538989228403458089>**');
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({ embed: fetcherror(504) });
		}

		const body = await res.json();

		const embed = this.client.util.embed()
			.setColor(0x5970c1);

		if (!(body.state || res.ok)) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, data, round);
	}

	async rounds(message, body, clan, round) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1);
		const availableRounds = body.rounds.filter(r => !r.warTags.includes('#0')).length;
		if (round && round > availableRounds) {
			embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${clan.tag}`)
				.setDescription([
					'This round is not available yet!',
					'',
					'**Available Rounds**',
					'',
					Array(availableRounds)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** <:green_tick:545874377523068930>`)
						.join('\n'),
					Array(body.rounds.length - availableRounds)
						.fill(0)
						.map((x, i) => `**\`${i + availableRounds + 1}\`** <:red_tick:545968755423838209>`)
						.join('\n')
				]);
			return message.util.send({ embed });
		}

		const rounds = round
			? body.rounds[round - 1].warTags
			: body.rounds.filter(d => !d.warTags.includes('#0')).length === body.rounds.length
				? body.rounds.pop().warTags
				: body.rounds.filter(d => !d.warTags.includes('#0'))
					.slice(-2)
					.reverse()
					.pop()
					.warTags;
		for (const tag of rounds) {
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(tag)}`, {
				method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});
			const data = await res.json();
			if ((data.clan && data.clan.tag === clan.tag) || (data.opponent && data.opponent.tag === clan.tag)) {
				const myclan = data.clan.tag === clan.tag ? data.clan : data.opponent;
				const oppclan = data.clan.tag === clan.tag ? data.opponent : data.clan;
				embed.setAuthor(`${myclan.name} (${myclan.tag})`, myclan.badgeUrls.medium)
					.addField('War Against', `${oppclan.name} (${oppclan.tag})`)
					.addField('Team Size', `${data.teamSize}`);
				if (data.state === 'warEnded') {
					const end = new Date(moment(data.endTime).toDate()).getTime();
					embed.addField('State', 'War Ended')
						.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`<:cp_star:696274427972681768> ${data.clan.stars} <:cp_fire:696276054058467328> ${data.clan.destructionPercentage.toFixed(2)}% <:cp_sword:631128558206713856> ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`<:cp_star:696274427972681768> ${data.opponent.stars} <:cp_fire:696276054058467328> ${data.opponent.destructionPercentage.toFixed(2)}% <:cp_sword:631128558206713856> ${data.opponent.attacks}`
						]);
				}
				if (data.state === 'inWar') {
					const started = new Date(moment(data.startTime).toDate()).getTime();
					embed.addField('State', 'In War')
						.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`<:cp_star:696274427972681768> ${data.clan.stars} <:cp_fire:696276054058467328> ${data.clan.destructionPercentage.toFixed(2)}% <:cp_sword:631128558206713856> ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`<:cp_star:696274427972681768> ${data.opponent.stars} <:cp_fire:696276054058467328> ${data.opponent.destructionPercentage.toFixed(2)}% <:cp_sword:631128558206713856> ${data.opponent.attacks}`
						]);
				}
				if (data.state === 'preparation') {
					const start = new Date(moment(data.startTime).toDate()).getTime();
					embed.addField('State', 'Preparation Day')
						.addField('Starting In', `${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`);
				}
				embed.addField('Rosters', [
					`**${data.clan.name}**`,
					await this.count(data.clan.members),
					'',
					`**${data.opponent.name}**`,
					await this.count(data.opponent.members)
				]);
				embed.setFooter(`Round #${round || body.rounds.findIndex(round => round.warTags === rounds) + 1}`);
			}
		}
		return message.util.send({ embed });
	}

	async count(members) {
		let TH13 = 0;
		let TH12 = 0;
		let TH11 = 0;
		let TH10 = 0;
		let TH09 = 0;
		let TH08 = 0;
		let TH07 = 0;
		let TH06 = 0;
		let TH05 = 0;
		let TH04 = 0;
		let TH03 = 0;
		let TH02 = 0;
		let TH01 = 0;
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

		return this.chunk(townHalls)
			.map(chunks => chunks.map(th => `${TownHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
				.join(' '))
			.join('\n');
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

module.exports = CwlRoundComamnd;
