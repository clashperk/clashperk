const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Resolver = require('../../struct/Resolver');
const moment = require('moment');
const { status } = require('../../util/constants');
const { townHallEmoji } = require('../../util/emojis');

class CWLRosterComamnd extends Command {
	constructor() {
		super('cwl-roster', {
			aliases: ['roster', 'cwl-roster'],
			category: 'cwl',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows cwl roster & total number of th for each clan.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
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
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`, {
			method: 'GET', timeout: 3000,
			headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
		}).catch(() => null);

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
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

		embed.setFooter(`${moment(body.season).format('MMMM YYYY')}`)
			.setAuthor('CWL Roster')
			.setDescription('CWL Roster and Town-Hall Distribution');

		let index = 0;
		for (const clan of body.clans) {
			const reduced = clan.members.reduce((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});

			const townHalls = Object.entries(reduced)
				.map(entry => ({ level: entry[0], total: entry[1] }))
				.sort((a, b) => b.level - a.level);
			// const avg = townHalls.reduce((p, c) => p + (c.total * c.level), 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

			embed.addField(`\u200e${++index}. ${clan.tag === data.tag ? `**${clan.name} (${clan.tag})**` : `${clan.name} (${clan.tag})`}`, [
				this.chunk(townHalls)
					.map(chunks => chunks.map(th => `${townHallEmoji[th.level]} \`${th.total.toString().padStart(2, '0')}\``)
						.join(' '))
					.join('\n')
			]);
		}

		return message.util.send({ embed });
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

module.exports = CWLRosterComamnd;
