const { Command, Flag } = require('discord-akairo');
const Fetch = require('../../struct/Fetch');
const fetch = require('node-fetch');
const { firestore } = require('../../struct/Database');
const moment = require('moment');
const { geterror, fetcherror } = require('../../util/constants');
const { emoji, townHallEmoji } = require('../../util/emojis');

class CwlRosterComamnd extends Command {
	constructor() {
		super('cwl-roster', {
			aliases: ['roster', 'cwl-roster'],
			category: 'cwl',
			description: {
				content: 'Shows cwl roster & total number of th for each clan.',
				usage: '<#clan tag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	*args() {
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
				start: 'What would you like to search for?',
				retry: 'What would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
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

		embed.setFooter(`Season ${moment(body.season).format('MMMM YYYY')}`)
			.setAuthor('CWL Roster');

		let index = 0;
		for (const clan of body.clans) {
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
			for (const member of clan.members) {
				const TownHAll = member.townHallLevel;
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

			embed.addField(`${++index}. ${clan.tag === data.tag ? `**${clan.name} (${clan.tag})**` : `${clan.name} (${clan.tag})`}`, [
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

module.exports = CwlRosterComamnd;
