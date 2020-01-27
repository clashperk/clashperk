const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { firestore } = require('../../struct/Database');
const { fetcherror } = require('../../util/constants');
const Fetch = require('../../struct/Fetch');

class StartCommand extends Command {
	constructor() {
		super('start', {
			aliases: ['start'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Starts the donation tracker in a channel.',
				usage: '<clan tag> [channel/hexColor] [hexColor/channel]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #tracker #5970C1', '#8QU8J9LP #5970C1 #tracker']
			}
		});
	}

	*args() {
		const data = yield {
			type: 'clan',
			unordered: false,
			prompt: {
				start: 'What clan do you want to track donations?',
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
		const clans = await this.count(message);
		const limit = this.client.patron.guilds.get(message.guild, 'clanLimit', 3);
		if (clans >= limit) {
			const embed = this.client.util.embed()
				.setDescription([
					'**You have reached to the Maximum Limit**',
					'',
					'**[Buy ClashPerk Premium](https://patreon.com/clashperk)**'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		if (clans >= 3 && !this.client.voter.isVoter(message.author.id)) {
			const embed = this.client.util.embed()
				.setDescription([
					'**Not Voted!**',
					'',
					'**[Vote ClashPerk](https://discordbots.org/bot/526971716711350273/vote)**'
				])
				.setColor(5861569);
			return message.util.send({ embed });
		}

		await firestore.collection('tracking_clans')
			.doc(`${message.guild.id}${data.tag}`)
			.update({
				tag: data.tag,
				name: data.name,
				color,
				user: message.author.id,
				channel: channel.id,
				guild: message.guild.id,
				createdAt: new Date()
			}, { merge: true });

		this.client.tracker.add(data.tag, message.guild.id, channel.id, color);

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} ${data.tag}`, data.badgeUrls.small)
			.setDescription(`Started tracking in ${channel} (${channel.id})`)
			.setColor(color);
		return message.util.send({ embed });
	}

	async count(message) {
		const clans = await firestore.collection('tracking_clans')
			.where('guild', '==', message.guild.id)
			.get()
			.then(snap => snap.size);
		return clans;
	}
}

module.exports = StartCommand;
