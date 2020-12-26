const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');

class MemeCommand extends Command {
	constructor() {
		super('meme', {
			aliases: ['meme', 'memes', 'jokes'],
			category: 'other',
			description: {
				content: 'Shows some random reddit memes.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const page = Math.floor(Math.random() * 100) + 1;
		try {
			const res = await fetch(`https://api.imgur.com/3/gallery/r/memes/all/${page}`, {
				method: 'GET',
				headers: { Authorization: `Client-ID ${process.env.IMGUR}` }
			});
			const data = await res.json();

			const image = Math.floor(Math.random() * data.data.length) + 1;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setTitle(data.data[image].title.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()))
				.setURL(data.data[image].link)
				.setImage(data.data[image].link);
			return message.channel.send({ embed });
		} catch { }
	}
}

module.exports = MemeCommand;
