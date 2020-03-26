const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');

class MemeCommand extends Command {
	constructor() {
		super('meme', {
			aliases: ['meme', 'memes', 'jokes'],
			category: 'other',
			cooldown: 3000,
			description: {
				content: 'Receives random Memes.'
			}
		});
	}

	async exec(message) {
		const page = Math.floor(Math.random() * 100) + 10;
		const image = Math.floor(Math.random() * 100) + 10;
		try {
			const res = await fetch(`https://api.imgur.com/3/gallery/r/memes/all/${page}`, {
				method: 'GET',
				headers: { Authorization: `Client-ID ${process.env.IMGUR}` }
			});
			const data = await res.json();
			const embed = new MessageEmbed()
				.setColor(5861569)
				.setTitle(data.data[image].title.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()))
				.setURL(data.data[image].link)
				.setImage(data.data[image].link);
			return message.channel.send({ embed });
		} catch { } // eslint-disable-line
	}
}

module.exports = MemeCommand;
