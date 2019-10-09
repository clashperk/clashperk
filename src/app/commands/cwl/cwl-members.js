const { Command, Flag } = require('discord-akairo');
const fetch = require('node-fetch');
const { Util } = require('discord.js');
const { stripIndent } = require('common-tags');
const Fetch = require('../../struct/Fetch');
const { firestore } = require('../../struct/Database');
const { geterror, fetcherror } = require('../../util/constants');

const API = [
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImIzYTdkMDcxLTM0M2UtNDA2Yy04MDQ0LWFmNDk0NmQ1OGVhNSIsImlhdCI6MTU2ODMwNjEwNSwic3ViIjoiZGV2ZWxvcGVyLzNiZTY0NzFkLWM1ODAtNjIyMy0xOWNhLTRkY2ZmNzhiMDBiNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.OWvKCU1bdNx0to3d316jsH2xwfZ8mKfnZypNetsBakbhrwOiiWojkAWiKd2iM0Bdqx7cIXTlJgZptpx-YKyWgw',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImRjYzA1ZWU0LWFjZWMtNGY5My1hZWNiLWJjOTU1YThiYmUxMiIsImlhdCI6MTU2ODMwNjExMywic3ViIjoiZGV2ZWxvcGVyLzNiZTY0NzFkLWM1ODAtNjIyMy0xOWNhLTRkY2ZmNzhiMDBiNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.N75KyVEJSwOPLoKtXjkhQ1v38LQMIhj8LA6hQqMLHT2ctTHN5ipI73s01Yzibhg59jeipMDLC6fLlH4x155lTA',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjI0NmFlYzU1LTgxZWYtNDNlOS05MzkxLThlNGVhYTlkOTAyZSIsImlhdCI6MTU2ODMwNjEyMiwic3ViIjoiZGV2ZWxvcGVyLzNiZTY0NzFkLWM1ODAtNjIyMy0xOWNhLTRkY2ZmNzhiMDBiNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.xr2AStr1a1n9R56BFA1TAn8qgEYGraX23ZmOxV3xJKb2zVZyGT4fSeVrKWDIie682dO_MnYQE8rlTXPmepgYIg',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjM1ZTE3OWU2LWViZWEtNGMxYS05NzlkLTQ4MjM3NTkzNzcwMyIsImlhdCI6MTU2ODMwNjEzMywic3ViIjoiZGV2ZWxvcGVyLzNiZTY0NzFkLWM1ODAtNjIyMy0xOWNhLTRkY2ZmNzhiMDBiNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.jNDGf9xsDjKZYHMIGAMU4APdMm1WtX3FjoxCT6Mpc2RoxqICDyeBjrZyWGgeZ1woif4yUxAl0ZK9njhdLD9h_w',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjRkM2EyMWQ1LWNmODYtNDVkOS04OWFhLWRjYTI1MDliODc1YSIsImlhdCI6MTU2ODMwNjE0MSwic3ViIjoiZGV2ZWxvcGVyLzNiZTY0NzFkLWM1ODAtNjIyMy0xOWNhLTRkY2ZmNzhiMDBiNCIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.O3gLGXp8p3br0JGEHl_DGUZM0DVWF2FOH81unCZ79FvjW8catobY8JbPV8bD0X8TzrgsQX-8UexCMSXtVV8miw',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0NGFjMDdmLWY0NmYtNDBiYS1iYjllLTRkNmFlYjQ5MzYwNCIsImlhdCI6MTU2ODM0Njc2Mywic3ViIjoiZGV2ZWxvcGVyL2ZiMjgwMWUyLTA5ZGUtYjU0OC05ZWEwLTkzMDExYzY1YmUyYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.SeHrl1cNjeXj7YNFRydDYH8waM7H1ZJP4kVtkAe9fsomhZLWaDAQMuS4Dr8_WFFFsqYNlUVG-BP9gnQMrqJ8Hw',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjM0NDhlNThmLTc4ODYtNGE0Yy1hYTM3LWNiZWFjNzc0MDkzYiIsImlhdCI6MTU2ODM0Njc3MCwic3ViIjoiZGV2ZWxvcGVyL2ZiMjgwMWUyLTA5ZGUtYjU0OC05ZWEwLTkzMDExYzY1YmUyYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.5cGkrmcG5op7bpmvqBNjXl7eQAbdjgxtEEqEvto2eXgniIgWXdkRqJUGDP4UVyclR7fIfrH1fNTUtQvoYv-VaQ',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjZiNTk0MTJlLTViNTUtNDQwNS04ZjUxLTUxNTczYjE0ZDBjNiIsImlhdCI6MTU2ODM0Njc4MCwic3ViIjoiZGV2ZWxvcGVyL2ZiMjgwMWUyLTA5ZGUtYjU0OC05ZWEwLTkzMDExYzY1YmUyYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.uBYFzBZ77aPlVtQlRoAwRFW4SOBPEdu39yg8qsQtHnwBacMbMjEQK1QwzB96vgX5sgses67P6J6MABu8MUXbzw',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjY4ZWJmYTBjLWMxOWYtNGI2MC05ZTJhLWVhMGYxYzVjZjBkMyIsImlhdCI6MTU2ODM0Njc5NCwic3ViIjoiZGV2ZWxvcGVyL2ZiMjgwMWUyLTA5ZGUtYjU0OC05ZWEwLTkzMDExYzY1YmUyYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.-PLch4MzuPXEfWItC91ar3hq8ke_wqvTQfeYRvBsAJpVUuh0jxtO5_RUdx9SF9yShCwItpuRI0fC3jnvbQUL6g',
	'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImVkMjQ0NDJhLTA3OGUtNGJiMC1iMWE0LTIyZTc3YmZkOWIyMiIsImlhdCI6MTU2ODM0NjgwMSwic3ViIjoiZGV2ZWxvcGVyL2ZiMjgwMWUyLTA5ZGUtYjU0OC05ZWEwLTkzMDExYzY1YmUyYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjM0LjY3LjI0Mi40NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.46CiAxuj2qBclTPeh3s54TfhRIIQy4IOdVO96VH6fU0ng3XAFLC1sqPQPnGeX3tj_4O9gwooYUB1KMEXheBaFA'
];

class CwlMembersComamnd extends Command {
	constructor() {
		super('cwl-members', {
			aliases: ['cwl-members', 'cwl-mem', 'cwl-lineup'],
			category: 'cwl',
			description: {
				content: 'CWL members command.',
				usage: '<tag>',
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
				start: 'What would you like to search for?',
				retry: 'What would you like to search for?'
			}
		};
		return { data };
	}


	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data }) {
		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar/leaguegroup`;
		const res = await fetch(uri, {
			method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` }
		});

		if (!res.ok) {
			const embed = this.client.util.embed()
				.setColor(3093046)
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
				.setThumbnail(data.badgeUrls.medium)
				.setDescription('CLAN IS NOT IN CWL');
			return message.util.send({ embed });
		}

		const clan = await res.json();

		const clanMembers = clan.clans.find(clan => clan.tag === data.tag).members;
		const object_array = await Promise.all([
			this.one(clanMembers.slice(0, 5).map(m => m.tag)),
			this.two(clanMembers.slice(5, 10).map(m => m.tag)),
			this.three(clanMembers.slice(10, 15).map(m => m.tag)),
			this.four(clanMembers.slice(15, 20).map(m => m.tag)),
			this.five(clanMembers.slice(20, 25).map(m => m.tag)),
			this.six(clanMembers.slice(25, 30).map(m => m.tag)),
			this.seven(clanMembers.slice(30, 35).map(m => m.tag)),
			this.eight(clanMembers.slice(35, 40).map(m => m.tag)),
			this.nine(clanMembers.slice(40, 45).map(m => m.tag)),
			this.ten(clanMembers.slice(45, 50).map(m => m.tag))
		]);

		const memberList = [];
		/* [[1, 4], [2], [3]].reduce((a, b) => {
			a.push(...b);
			return a;
		}, []);*/
		for (const array of object_array) {
			for (const member of array) {
				memberList.push({
					tag: member.tag,
					name: member.name,
					townHallLevel: member.townHallLevel,
					heroes: member.heroes.filter(a => a.village === 'home')
				});
			}
		}

		let members = '';
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ~ ${memberList.length}`, data.badgeUrls.medium);

		for (const member of memberList.sort((a, b) => b.townHallLevel - a.townHallLevel)) {
			members += stripIndent`${this.padStart(member.townHallLevel)}  ${this.heroes(member.heroes).map(x => this.padStart(x.level)).join('  ')}  ${member.name}`;
			members += '\n';
		}

		const header = stripIndent`TH  BK  AQ  GW  PLAYER`;
		const result = this.split(members);
		if (Array.isArray(result)) {
			embed.setDescription([
				`\`\`\`json\n${header}\n\n${result[0]}\n\`\`\``
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

	heroes(items) {
		return Object.assign([
			{ level: '00' },
			{ level: '00' },
			{ level: '00' }
		], items);
	}

	padStart(number) {
		return number.toString().padStart(2, 0);
	}

	split(content) {
		return Util.splitMessage(content, { maxLength: 2048 });
	}

	async one(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[0]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async two(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[1]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async three(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[2]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async four(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[3]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async five(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[4]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async six(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[5]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async seven(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[6]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async eight(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[7]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async nine(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[8]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}

	async ten(items, collection = []) {
		for (const tag of items) {
			const uri = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`;
			const member = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${API[9]}` } }).then(res => res.json());
			collection.push({ name: member.name, tag: member.tag, townHallLevel: member.townHallLevel, heroes: member.heroes });
		}
		return collection;
	}
}

module.exports = CwlMembersComamnd;
