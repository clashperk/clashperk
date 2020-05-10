const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji, townHallEmoji } = require('../../util/emojis');

class CWLRoundComamnd extends Command {
	constructor() {
		super('cwl-round', {
			aliases: ['round', 'cwl-war', 'cwl-round'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows info about current cwl war.',
				usage: '<clanTag> [--round/-r] [round]',
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
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 2000;
		return 15000;
	}

	*args() {
		const round = yield {
			match: 'option',
			flag: ['--round', '-r'],
			type: Argument.range('integer', 1, 7, true)
		};

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

		return { data, round };
	}

	async exec(message, { data, round }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status[504]
				}
			});
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

	async rounds(message, body, clan_, round) {
		const rounds_ = body.rounds.filter(r => !r.warTags.includes('#0')).length;
		if (round && round > rounds_) {
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setAuthor(`${clan_.name} (${clan_.tag})`, clan_.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${clan_.tag}`)
				.setDescription([
					'This round is not available yet!',
					'',
					'**Available Rounds**',
					'',
					new Array(rounds_)
						.fill(0)
						.map((x, i) => `**\`${i + 1}\`** ${emoji.ok}`)
						.join('\n'),
					new Array(body.rounds.length - rounds_)
						.fill(0)
						.map((x, i) => `**\`${i + rounds_ + 1}\`** ${emoji.wrong}`)
						.join('\n')
				]);
			return message.util.send({ embed });
		}

		const rounds = body.rounds.filter(d => !d.warTags.includes('#0'));
		const chunks = [];
		let index = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clan_.tag) || (data.opponent && data.opponent.tag === clan_.tag)) {
					const clan = data.clan.tag === clan_.tag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;
					const embed = new MessageEmbed()
						.setColor(0x5970c1);
					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
						.addField('War Against', `${opponent.name} (${opponent.tag})`)
						.addField('Team Size', `${data.teamSize}`);
					if (data.state === 'warEnded') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.addField('State', 'War Ended')
							.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
							.addField('Stats', [
								`**${data.clan.name}**`,
								`${emoji.star} ${data.clan.stars} ${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.clan.attacks}`,
								'',
								`**${data.opponent.name}**`,
								`${emoji.star} ${data.opponent.stars} ${emoji.fire} ${data.opponent.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.opponent.attacks}`
							]);
					}
					if (data.state === 'inWar') {
						const started = new Date(moment(data.startTime).toDate()).getTime();
						embed.addField('State', 'In War')
							.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
							.addField('Stats', [
								`**${data.clan.name}**`,
								`${emoji.star} ${data.clan.stars} ${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.clan.attacks}`,
								'',
								`**${data.opponent.name}**`,
								`${emoji.star} ${data.opponent.stars} ${emoji.fire} ${data.opponent.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.opponent.attacks}`
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
					embed.setFooter(`Round #${++index}`);

					chunks.push({ state: data.state, embed });
				}
			}
		}

		const item = round
			? chunks[round - 1]
			: chunks.length === 7
				? chunks.find(c => c.state === 'inWar') || chunks.slice(-1)[0]
				: chunks.slice(-2)[0];
		const pageIndex = chunks.indexOf(item);

		let page = pageIndex + 1;
		const paginated = this.paginate(chunks, page);

		if (chunks.length === 1) {
			return message.util.send({ embed: paginated.items[0].embed });
		}
		const msg = await message.util.send({ embed: paginated.items[0].embed });
		for (const emoji of ['⬅️', '➡️']) {
			await msg.react(emoji);
			await this.delay(250);
		}

		const collector = msg.createReactionCollector(
			(reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id,
			{ time: 60000, max: 10 }
		);

		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➡️') {
				page += 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				console.log(page);
				const { embed } = this.paginate(chunks, page).items[0];
				await msg.edit({ embed });
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}

			if (reaction.emoji.name === '⬅️') {
				page -= 1;
				if (page < 1) page = paginated.maxPage;
				if (page > paginated.maxPage) page = 1;
				console.log(page);
				const { embed } = this.paginate(chunks, page).items[0];
				await msg.edit({ embed });
				await this.delay(250);
				await reaction.users.remove(message.author.id);
				return message;
			}
		});

		collector.on('end', async () => {
			await msg.reactions.removeAll().catch(() => null);
			return message;
		});
		return message;
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	paginate(items, page = 1, pageLength = 1) {
		const maxPage = Math.ceil(items.length / pageLength);
		if (page < 1) page = 1;
		if (page > maxPage) page = maxPage;
		const startIndex = (page - 1) * pageLength;

		return {
			items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
			page, maxPage, pageLength
		};
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
			.map(chunks => chunks.map(th => `${townHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
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

module.exports = CWLRoundComamnd;
