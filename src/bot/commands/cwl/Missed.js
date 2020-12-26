const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');
const { status } = require('../../util/Constants');
const Resolver = require('../../struct/Resolver');
const { emoji, RED_EMOJI } = require('../../util/Emojis');
const CWL = require('../../core/CWLWarTags');

class CWLMissedComamnd extends Command {
	constructor() {
		super('cwl-missed', {
			aliases: ['cwl-missed'],
			category: 'cwl-hidden',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES'],
			description: {
				content: [
					'Shows missed attacks of all rounds.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--round', '-r']
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	async exec(message, { data }) {
		await message.util.send(`**Fetching data... ${emoji.loading}**`);
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
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

		if (!(body.state || res.ok)) {
			const cw = await CWL.get(data.tag);
			if (cw) {
				return this.rounds(message, cw, data);
			}
			const embed = this.client.util.embed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('Clan is not in CWL');
			return message.util.send({ embed });
		}

		CWL.pushWarTags(data.tag, body.rounds);
		return this.rounds(message, body, data);
	}

	async rounds(message, body, clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const [object, clanTag] = [{}, clan.tag];
		let round = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET',
					headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();
				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (data.state === 'warEnded') {
						for (const member of clan.members) {
							if (member.attacks && member.attacks.length === 1) continue;
							object[member.tag] = {
								count: (object[member.tag] || { count: 0 }).count + 1,
								name: member.name
							};
						}
						round += 1;
					}
					break;
				}
			}
		}

		const collection = Object.values(object);
		if (rounds.length < 3 && !collection.length) {
			return message.util.send('This command is available after the end of a round.');
		}

		if (!collection.length) {
			return message.util.send('Hmm! Looks like everyone attacked.');
		}

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.small)
			.setTitle('Missed Attacks')
			.setDescription(collection.sort((a, b) => b.count - a.count).map(m => `\u200e${RED_EMOJI[m.count]} ${m.name}`))
			.setFooter(`Upto Round #${round}`);

		return message.util.send({ embed });
	}
}

module.exports = CWLMissedComamnd;
