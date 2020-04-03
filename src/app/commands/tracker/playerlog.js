const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore } = require('../../struct/Database');

class PlayerLogCommand extends Command {
	constructor() {
		super('playerlog', {
			aliases: ['playerlog'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Starts the player-log in a channel.',
				usage: '<clan tag> [channel/hexColor] [hexColor/channel]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #player-log #5970C1', '#8QU8J9LP #5970C1 #player-log']
			}
		});
	}

	*args() {
		const data = yield {
			type: 'clan',
			unordered: false,
			prompt: {
				start: 'What clan do you want to track memberlog?',
				retry: (msg, { failure }) => failure.value
			}
		};

		const channel = yield {
			type: 'textChannel',
			unordered: [1, 2],
			default: message => message.channel
		};

		const color = yield {
			type: 'color',
			unordered: [1, 2],
			default: 5861569
		};

		return { data, channel, color };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 3000;
		return 20000;
	}

	async exec(message, { data, channel, color }) {
		const clans = await this.clans(message);
		const max = this.client.patron.guilds.get(message.guild, 'clanLimit', 2);
		if (clans.length >= max && !clans.map(clan => clan.tag).includes(data.tag)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only claim 2 clans per guild!',
					'',
					'**Want more than that?**',
					'Consider subscribing to one of our premium plans on Patreon',
					'',
					'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		const isPatron = this.client.patron.users.get(message.author, 'patron', false);
		const isVoter = this.client.voter.isVoter(message.author.id);
		if (clans.length >= 1 && !clans.map(clan => clan.tag).includes(data.tag) && !(isVoter || isPatron)) {
			const embed = this.client.util.embed()
				.setDescription([
					'**Not Voted!**',
					'',
					'Want to claim one more clan? Please consider voting us on Discord Bot List',
					'',
					'[Vote ClashPerk](https://top.gg/bot/526971716711350273/vote)'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		const ref = await firestore.collection('tracking_clans').doc(`${message.guild.id}${data.tag}`);
		await ref.update({
			tag: data.tag,
			name: data.name,
			user: message.author.id,
			memberlogEnabled: true,
			guild: message.guild.id,
			memberlog: {
				channel: channel.id
			},
			isPremium: this.client.patron.guilds.get(message.guild, 'patron', false),
			createdAt: new Date()
		}, { merge: true });

		const metadata = await ref.get().then(snap => snap.data());

		this.client.tracker.add(data.tag, message.guild.id, metadata);
		this.client.tracker.push(metadata);

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} ${data.tag}`, data.badgeUrls.small)
			.setDescription(`Started tracking in ${channel} (${channel.id})`)
			.setColor(color);
		return message.util.send({ embed });
	}

	async clans(message, clans = []) {
		await firestore.collection('tracking_clans')
			.where('guild', '==', message.guild.id)
			.get()
			.then(snap => {
				snap.forEach(doc => {
					clans.push(doc.data());
				});
				if (!snap.size) clans = [];
			});
		return clans;
	}
}

module.exports = PlayerLogCommand;
