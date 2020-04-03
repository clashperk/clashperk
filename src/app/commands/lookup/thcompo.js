const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror, TownHallEmoji } = require('../../util/constants');

const API = process.env.APIS.split(',');

class ThCompoCommand extends Command {
	constructor() {
		super('th-compo', {
			aliases: ['th-compo', 'compo'],
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Calculates TH compositions of a clan.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
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
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data }) {
		await message.util.send('**Calculating TH compositions of your clan... <a:loading:538989228403458089>**');
		const hrStart = process.hrtime();
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

		const list = data.memberList.map(m => m.tag);
		const funcs = new Array(Math.ceil(list.length / 5)).fill().map(() => list.splice(0, 5))
			.map((tags, index) => async (collection = []) => {
				for (const tag of tags) {
					const member = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
						method: 'GET',
						headers: { Accept: 'application/json', authorization: `Bearer ${API[index]}` }
					}).then(res => res.json());
					collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
				}
				return collection;
			});

		const requests = await Promise.all(funcs.map(func => func()));

		for (const request of requests) {
			for (const member of request) {
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
		}

		const math = (TH13 * 13) + (TH12 * 12) + (TH11 * 11) + (TH10 * 10) + (TH09 * 9) + (TH08 * 8) + (TH07 * 7) + (TH06 * 6) + (TH05 * 5) + (TH04 * 4) + (TH03 * 3) + (TH02 * 2) + Number(TH01);
		const total = TH13 + TH12 + TH11 + TH10 + TH09 + TH08 + TH07 + TH06 + TH05 + TH04 + TH03 + TH02 + TH01;
		const AVG = math / total || 0;

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setColor(0x5970c1)
			.setThumbnail(data.badgeUrls.small)
			.setDescription(
				`${TH13 > 0 ? `${TownHallEmoji[13]} ${TH13 < 10 ? `0${TH13}` : `${TH13}`}\n` : ''}` +
				`${TH12 > 0 ? `${TownHallEmoji[12]} ${TH12 < 10 ? `0${TH12}` : `${TH12}`}\n` : ''}` +
				`${TH11 > 0 ? `${TownHallEmoji[11]} ${TH11 < 10 ? `0${TH11}` : `${TH11}`}\n` : ''}` +
				`${TH10 > 0 ? `${TownHallEmoji[10]} ${TH10 < 10 ? `0${TH10}` : `${TH10}`}\n` : ''}` +
				`${TH09 > 0 ? `${TownHallEmoji[9]} ${TH09 < 10 ? `0${TH09}` : `${TH09}`}\n` : ''}` +
				`${TH08 > 0 ? `${TownHallEmoji[8]} ${TH08 < 10 ? `0${TH08}` : `${TH08}`}\n` : ''}` +
				`${TH07 > 0 ? `${TownHallEmoji[7]} ${TH07 < 10 ? `0${TH07}` : `${TH07}`}\n` : ''}` +
				`${TH06 > 0 ? `${TownHallEmoji[6]} ${TH06 < 10 ? `0${TH06}` : `${TH06}`}\n` : ''}` +
				`${TH05 > 0 ? `${TownHallEmoji[5]} ${TH05 < 10 ? `0${TH05}` : `${TH05}`}\n` : ''}` +
				`${TH04 > 0 ? `${TownHallEmoji[4]} ${TH04 < 10 ? `0${TH04}` : `${TH04}`}\n` : ''}` +
				`${TH03 > 0 ? `${TownHallEmoji[3]} ${TH03 < 10 ? `0${TH03}` : `${TH03}`}\n` : ''}` +
				`${TH02 > 0 ? `${TownHallEmoji[2]} ${TH02 < 10 ? `0${TH02}` : `${TH02}`}\n` : ''}`
			)
			.setFooter(`Avg: ${AVG.toFixed(2)} [${data.members}/50]`, 'https://cdn.discordapp.com/emojis/539370925515210763.png');

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send(`*\u200b**Executed in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**\u200b*`, { embed });
	}
}

module.exports = ThCompoCommand;
