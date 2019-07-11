const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');

class MemeCommand extends Command {
	constructor() {
		super('meme', {
			aliases: ['meme', 'memes'],
			clientPermissions: ['EMBED_LINKS'],
			category: 'fun',
			description: {
				content: 'Receives random Clash of Clans memes.'
			}
		});
	}

	async exec(message) {
		const image = Math.floor(Math.random() * 13) + 1;
		try {
			const res = await fetch('https://api.imgur.com/3/gallery/r/ClashOfClansMemes/all', { method: 'GET', headers: { Authorization: `Client-ID ${process.env.IMGUR}` } });
			const data = await res.json();
			const embed = new MessageEmbed()
				.setColor(0x5970c1)
				.setTitle(data.data[image].title.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase()))
				.setURL(data.data[image].link)
				.setImage(data.data[image].link);
			return message.channel.send({ embed });
		} catch (err) {
			return this.handler.handleDirectCommand(message, '', this.handler.modules.get('meme'), true);
		}
	}
}

module.exports = MemeCommand;
