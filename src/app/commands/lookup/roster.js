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

const HeroEmojis = {
	'Barbarian King': '<:barbarianking:524939911581663242>',
	'Archer Queen': '<:archerqueen:524939902408720394>',
	'Grand Warden': '<:grandwarden:524939931303411722>',
	'Battle Machine': '<:warmachine:524939920943349781>'
};

class CwlRosterComamnd extends Command {
	constructor() {
		super('cwl-roster', {
			aliases: ['roster', 'cwl-roster'],
			category: 'beta',
			description: {
				content: '',
				usage: '',
				examples: []
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

	async exec(message, { data }) {
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});
		const body = await res.json();

		const embed = this.client.util.embed()
			.setAuthor(body.season);

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
		for (const clan of body.clans) {
			for (const member of clan.members) {
				const TownHAll = member.townHallLevel;

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
			embed.addField(`${clan.name} (${clan.tag})`, [
				TH12,
				TH11
			]);
		}

		return message.channel.send({ embed });
	}
}

module.exports = CwlRosterComamnd;
