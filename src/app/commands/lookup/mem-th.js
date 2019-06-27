const { Command, Argument } = require('discord-akairo');
const { Util } = require('discord.js');
const fetch = require('node-fetch');
const { stripIndent } = require('common-tags');

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

class MembersTHCommand extends Command {
	constructor() {
		super('members-th', {
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Displays a list of clan members.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			cooldown: 20000,
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				},
				{
					id: 'th',
					type: Argument.range('integer', 1, 12, true)
				}
			]
		});
	}

	async exec(message, { data, th }) {
		const msg = await message.channel.send('**Making list of your clan members... <a:loading:538989228403458089>**');
		let TH12 = '';
		let TH11 = '';
		let TH10 = '';
		let TH09 = '';
		let TH08 = '';
		let TH07 = '';
		let TH06 = '';
		let TH05 = '';
		let TH04 = '';
		let TH03 = '';
		let TH02 = '';
		let TH01 = '';

		for (const tag of data.memberList.map(member => member.tag)) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
			const member = await res.json();

			const TownHAll = member.townHallLevel;

			if ((!th || th === 12) && TownHAll === 12) TH12 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 11) && TownHAll === 11) TH11 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 10) && TownHAll === 10) TH10 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 9) && TownHAll === 9) TH09 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 8) && TownHAll === 8) TH08 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 7) && TownHAll === 7) TH07 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 6) && TownHAll === 6) TH06 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 5) && TownHAll === 5) TH05 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 4) && TownHAll === 4) TH04 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 3) && TownHAll === 3) TH03 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 2) && TownHAll === 2) TH02 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
			if ((!th || th === 1) && TownHAll === 1) TH01 += `${TownHallEmoji[member.townHallLevel]} **${member.name}** ${member.tag}\n`;
		}

		const split = stripIndent`<:clans:534765878118449152> **${data.name} (${data.tag})**

		${TH12} ${TH11} ${TH10} ${TH09} ${TH08} ${TH07} ${TH06} ${TH05} ${TH04} ${TH03} ${TH02} ${TH01}`;

		const result = this.break(split);
		await msg.edit(`*\u200b**Executed in ${((Date.now() - message.createdTimestamp) / 1000).toFixed(2)} sec**\u200b*`);
		if (Array.isArray(result)) {
			return result.map(async res => message.channel.send({
				embed: {
					color: 0x5970c1,
					description: res
				}
			}));
		}
		return message.channel.send({
			embed: {
				color: 0x5970c1,
				description: result
			}
		});
	}

	break(data) {
		return Util.splitMessage(data, { maxLength: 1900 });
	}
}

module.exports = MembersTHCommand;
