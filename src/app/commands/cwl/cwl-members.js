const { Command } = require('discord-akairo');
const fetch = require('node-fetch');

const TownHallEmoji = {
	2: '<:townhall2:534745498561806357>',
	3: '<:townhall3:534745539510534144>',
	4: '<:townhall4:534745571798286346>',
	5: '<:townhall5:534745574251954176>',
	6: '<:townhall6:534745574738624524>',
	7: '<:townhall7:534745575732805670>',
	8: '<:townhall8:534745576802353152>',
	9: '<:townhall9:534745577033039882>',
	10: '<:townhall10:534745575757709332>',
	11: '<:townhall11:534745577599270923>',
	12: '<:townhall12:534745574981894154>'
};

class CwlMembersComamnd extends Command {
	constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem'],
			category: 'cwl',
			description: {
				content: 'Displays cwl member list.',
				usage: '<tag>',
				examples: ['#8QU8J9LP']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const clan = await res.json();

		const memberList = [];
		for (const member of clan.clans.find(clan => clan.tag === data.tag).members) {
			memberList.push({ tag: member.tag, name: member.name, townHallLevel: member.townHallLevel });
		}

		const first = this.paginate(this.sort(memberList), 0, 32);
		const second = this.paginate(this.sort(memberList), 32, 35);
		const third = this.paginate(this.sort(memberList), 35, 50);

		const embed = this.client.util.embed().setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${memberList.length}`, data.badgeUrls.medium)
			.setDescription(first.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'));
		if (data.members > 32) {
			embed.addField(second.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n'), [
				third.items.length ? third.items.map(member => `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}`).join('\n') : '\u200b'
			]);
		}

		return message.util.send({ embed });
	}

	sort(items) {
		return items.sort((a, b) => b.townHallLevel - a.townHallLevel);
	}

	paginate(items, start, end) {
		return { items: items.slice(start, end) };
	}
}

module.exports = CwlMembersComamnd;
