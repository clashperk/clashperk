const { Command, Argument, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const Fetch = require('../../struct/Fetch');
const moment = require('moment');
const { oneLine } = require('common-tags');
const { MessageEmbed } = require('discord.js');
const { geterror, fetcherror } = require('../../util/constants');
const { firestore } = require('../../struct/Database');

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

class CwlWarComamnd extends Command {
	constructor() {
		super('cwl-war', {
			aliases: ['cwl-war'],
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
				const data = await firestore.collection('linked_clans')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				if (!data[msg.guild.id]) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
				return Fetch.clan(data[msg.guild.id].tag).then(data => {
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
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const body = await res.json();

		const embed = this.client.util.embed()
			.setColor(0x5970c1);

		if (!body.state) {
			embed.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('CLAN IS NOT IN CWL');
			return message.util.send({ embed });
		}

		return this.rounds(message, body, data, round);
	}

	async rounds(message, body, clan, round) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1);
		const rounds = round ? body.rounds[round - 1].warTags : body.rounds.filter(d => !d.warTags.includes('#0')).pop().warTags;
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
		for (const tag of rounds) {
			const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(tag)}`, {
				method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
			});
			const data = await res.json();
			if ((data.clan && data.clan.tag === clan.tag) || (data.opponent && data.opponent.tag === clan.tag)) {
				embed.setAuthor(`${data.clan.name} (${data.clan.tag})`, data.clan.badgeUrls.medium)
					.addField('War Against', `${data.opponent.name} (${data.opponent.tag})`)
					.addField('Team Size', `${data.teamSize}`);
				if (data.state === 'warEnded') {
					const end = new Date(moment(data.endTime).toDate()).getTime();
					embed.addField('State', 'War Ended')
						.addField('War Ended', `${moment.duration(Date.now() - end).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`\\⭐ ${data.clan.stars} \\🔥 ${data.clan.destructionPercentage.toFixed(2)}% \\⚔ ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`\\⭐ ${data.opponent.stars} \\🔥 ${data.opponent.destructionPercentage.toFixed(2)}% \\⚔ ${data.opponent.attacks}`
						]);
				}
				if (data.state === 'inWar') {
					const started = new Date(moment(data.startTime).toDate()).getTime();
					embed.addField('State', 'In War')
						.addField('Started', `${moment.duration(Date.now() - started).format('D [days], H [hours] m [mins]', { trim: 'both mid' })} ago`)
						.addField('Stats', [
							`**${data.clan.name}**`,
							`\\⭐ ${data.clan.stars} \\🔥 ${data.clan.destructionPercentage.toFixed(2)}% \\⚔ ${data.clan.attacks}`,
							'',
							`**${data.opponent.name}**`,
							`\\⭐ ${data.opponent.stars} \\🔥 ${data.opponent.destructionPercentage.toFixed(2)}% \\⚔ ${data.opponent.attacks}`
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
			}
		}
		return message.util.send({ embed });
	}

	async count(members) {
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
			if (TownHAll === 12) ++TH12;
			if (TownHAll === 11) ++TH11;
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
		const data = oneLine`
            ${TH12 > 0 ? `${TownHallEmoji[12]} ${TH12 < 10 ? `0${TH12}` : `${TH12} `} ` : ''}
            ${TH11 > 0 ? `${TownHallEmoji[11]} ${TH11 < 10 ? `0${TH11}` : `${TH11}`} ` : ''}
            ${TH10 > 0 ? `${TownHallEmoji[10]} ${TH10 < 10 ? `0${TH10}` : `${TH10}`} ` : ''}
            ${TH09 > 0 ? `${TownHallEmoji[9]} ${TH09 < 10 ? `0${TH09}` : `${TH09}`} ` : ''}
            ${TH08 > 0 ? `${TownHallEmoji[8]} ${TH08 < 10 ? `0${TH08}` : `${TH08}`} ` : ''}
            ${TH07 > 0 ? `${TownHallEmoji[7]} ${TH07 < 10 ? `0${TH07}` : `${TH07}`} ` : ''}
            ${TH06 > 0 ? `${TownHallEmoji[6]} ${TH06 < 10 ? `0${TH06}` : `${TH06}`} ` : ''}
            ${TH05 > 0 ? `${TownHallEmoji[5]} ${TH05 < 10 ? `0${TH05}` : `${TH05}`} ` : ''}
            ${TH04 > 0 ? `${TownHallEmoji[4]} ${TH04 < 10 ? `0${TH04}` : `${TH04}`} ` : ''}
            ${TH03 > 0 ? `${TownHallEmoji[3]} ${TH03 < 10 ? `0${TH03}` : `${TH03}`} ` : ''}
            ${TH02 > 0 ? `${TownHallEmoji[2]} ${TH02 < 10 ? `0${TH02}` : `${TH02}`} ` : ''}
            ${TH01 > 0 ? `${TownHallEmoji[1]} ${TH01 < 10 ? `0${TH01}` : `${TH01}`} ` : ''}`;
		return data;
	}
}

module.exports = CwlWarComamnd;
