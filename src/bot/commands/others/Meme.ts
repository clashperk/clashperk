import { MessageEmbed, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import fetch from 'node-fetch';

export default class MemeCommand extends Command {
	public constructor() {
		super('meme', {
			aliases: ['meme', 'memes', 'jokes'],
			category: 'other',
			description: {
				content: 'Shows some random reddit memes.'
			}
		});
	}

	public async exec(message: Message) {
		const page = Math.floor(Math.random() * 100) + 1;
		try {
			const res = await fetch(`https://api.imgur.com/3/gallery/r/memes/all/${page}`, {
				method: 'GET',
				headers: { Authorization: `Client-ID ${process.env.IMGUR!}` }
			});
			const data = await res.json();

			const image = Math.floor(Math.random() * data.data.length) + 1;
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setTitle(data.data[image].title.toLowerCase().replace(/\b(\w)/g, (char: string) => char.toUpperCase()))
				.setURL(data.data[image].link)
				.setImage(data.data[image].link);
			return message.channel.send({ embeds: [embed] });
		} catch { }
	}
}
