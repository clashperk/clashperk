const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');
const { Util } = require('discord.js');

class CWLRemainingComamnd extends Command {
	constructor() {
		super('cwl-remaining', {
			aliases: ['cwl-remaining', 'cwl-missing'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows remaining attacks of current cwl.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP'],
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
			type: Argument.range('integer', 1, Infinity, true)
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
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
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

		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const chunks = [];
		let i = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clan_.tag) || (data.opponent && data.opponent.tag === clan_.tag)) {
					const embed = new MessageEmbed()
						.setColor(0x5970c1);

					const clan = data.clan.tag === clan_.tag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clan_.tag ? data.opponent : data.clan;

					embed.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium);
					if (data.state === 'warEnded') {
						let missing = '';
						let index = 0;
						for (const member of this.sort(clan.members)) {
							if (member.attacks && member.attacks.length === 1) {
								++index;
								continue;
							}
							missing += `\`${this.index(++index)} ${this.padEnd(member.name)}\`\n`;
						}

						embed.setDescription([
							'**War Against**',
							`${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							'War Ended',
							'',
							`**Missed Attacks** - ${clan.members.filter(m => !m.attacks).length}/${data.teamSize}`,
							missing || 'All Players Attacked'
						]);
						const end = new Date(moment(data.endTime).toDate()).getTime();
						embed.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
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
						let missing = '';
						let index = 0;
						for (const member of this.sort(clan.members)) {
							if (member.attacks && member.attacks.length === 1) {
								++index;
								continue;
							}
							missing += `\`${this.index(++index)} ${this.padEnd(member.name)}\`\n`;
						}

						embed.setDescription([
							'**War Against**',
							`${opponent.name} (${opponent.tag})`,
							'',
							'**State**',
							'In War',
							'',
							`**Missing Attacks** - ${clan.members.filter(m => !m.attacks).length}/${data.teamSize}`,
							missing || 'All Players Attacked'
						]);
						embed.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
							.addField('Stats', [
								`**${data.clan.name}**`,
								`${emoji.star} ${data.clan.stars} ${emoji.fire} ${data.clan.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.clan.attacks}`,
								'',
								`**${data.opponent.name}**`,
								`${emoji.star} ${data.opponent.stars} ${emoji.fire} ${data.opponent.destructionPercentage.toFixed(2)}% ${emoji.attacksword} ${data.opponent.attacks}`
							]);
					}
					if (data.state === 'preparation') {
						embed.addField('War Against', `${opponent.name} (${opponent.tag})`);
						const start = new Date(moment(data.startTime).toDate()).getTime();
						embed.addField('State', 'Preparation Day')
							.addField('Starting In', `${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`);
					}

					embed.setFooter(`Round #${++i}`);

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

	sort(items) {
		return items.sort((a, b) => a.mapPosition - b.mapPosition);
	}

	index(num) {
		return num.toString().padStart(2, '0');
	}

	padEnd(data) {
		return Util.escapeInlineCode(data).padEnd(20, ' ');
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
}

module.exports = CWLRemainingComamnd;
