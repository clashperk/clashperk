const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const moment = require('moment');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/constants');
const Resolver = require('../../struct/Resolver');
const { emoji } = require('../../util/emojis');

class CWLStatsComamnd extends Command {
	constructor() {
		super('cwl-stats', {
			aliases: ['cwl-stats'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows stats about current cwl war.',
				usage: '<clanTag> [--round/-r] [round]',
				examples: ['#8QU8J9LP', '#8QU8J9LP -r 5', '#8QU8J9LP --round 4']
			}
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

	async exec(message, { data }) {
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

		return this.rounds(message, body, { clanTag: data.tag, clanName: data.name, clanBadge: data.badgeUrls.medium });
	}

	async rounds(message, body, { clanTag, clanName, clanBadge } = {}) {
		const collection = [];
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		let index = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (data.state === 'warEnded') {
						const end = new Date(moment(data.endTime).toDate()).getTime();
						collection.push([[
							`${this.isWinner(clan, opponent)} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Ended ${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`
						], [
							`\`${data.clan.stars.toString().padEnd(14, ' ')} Stars ${data.opponent.stars.toString().padStart(14, ' ')}\``,
							`\`${this.attacks(data.clan.attacks, data.teamSize).padEnd(13, ' ')} Attacks ${this.attacks(data.opponent.attacks, data.teamSize).padStart(13, ' ')}\``,
							`\`${this.destruction(data.clan.destructionPercentage).padEnd(11, ' ')} Destruction ${this.destruction(data.opponent.destructionPercentage).padStart(11, ' ')}\``
						]]);
					}
					if (data.state === 'inWar') {
						const started = new Date(moment(data.startTime).toDate()).getTime();
						collection.push([[
							`${emoji.loading} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Started ${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`
						], [
							`\`${data.clan.stars.toString().padEnd(14, ' ')} Stars ${data.opponent.stars.toString().padStart(14, ' ')}\``,
							`\`${this.attacks(data.clan.attacks, data.teamSize).padEnd(13, ' ')} Attacks ${this.attacks(data.opponent.attacks, data.teamSize).padStart(13, ' ')}\``,
							`\`${this.destruction(data.clan.destructionPercentage).padEnd(11, ' ')} Destruction ${this.destruction(data.opponent.destructionPercentage).padStart(11, ' ')}\``
						]]);
					}
					/* if (data.state === 'preparation') {
						const start = new Date(moment(data.startTime).toDate()).getTime();
						collection.push([[
							`${this.isWinner(clan, opponent)} **${clan.name}** vs **${opponent.name}**`,
							`${emoji.clock_small} [Round ${++index}] Starts in ${moment.duration(start - Date.now()).format('D [days], H [hours] m [mins]', { trim: 'both mid' })}`
						], [
							`\`${data.clan.stars.toString().padEnd(14, ' ')} Stars ${data.opponent.stars.toString().padStart(14, ' ')}\``,
							`\`${this.attacks(data.clan.attacks, data.teamSize).padEnd(13, ' ')} Attacks ${this.attacks(data.opponent.attacks, data.teamSize).padStart(13, ' ')}\``,
							`\`${this.destruction(data.clan.destructionPercentage).padEnd(11, ' ')} Destruction ${this.destruction(data.opponent.destructionPercentage).padStart(11, ' ')}\``
						]]);
					}*/
				}
			}
		}

		const description = collection.map(arr => {
			const header = arr[0].join('\n');
			const description = arr[1].join('\n');
			return [header, description].join('\n');
		}).join('\n\n');

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${clanName} CWL`, clanBadge)
			.setDescription(description);
		return message.util.send({ embed });
	}

	destruction(dest) {
		return dest.toFixed(2).toString().concat('%');
	}

	attacks(num, team) {
		return num.toString().concat(`/${team}`);
	}

	isWinner(clan, opponent) {
		if (clan.stars > opponent.stars) {
			return emoji.ok;
		} else if (clan.stars < opponent.stars) {
			return emoji.wrong;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return emoji.ok;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return emoji.wrong;
		}
		return emoji.empty;
	}
}

module.exports = CWLStatsComamnd;
