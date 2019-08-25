const { Command, Argument } = require('discord-akairo');
const request = require('request');
const { firebase } = require('../../struct/Database');

class AddMemeCommand extends Command {
	constructor() {
		super('add-meme', {
			aliases: ['add-meme'],
			clientPermissions: ['EMBED_LINKS'],
			category: 'owner',
			description: {
				content: 'Add meme by url or upload.',
				usage: '<"title"> <url/upload>'
			},
			args: [
				{
					id: 'title',
					type: 'string',
					prompt: {
						start: 'what is the title of the meme?'
					}
				},
				{
					id: 'url',
					type: Argument.union((msg, str) => {
						if (!str) return null;
						const resolver = this.handler.resolver.type('url');
						return resolver(msg, str.replace(/<(.+)>/g, '$1'));
					}, msg => {
						if (!msg.attachments.size) return null;
						return msg.attachments.first().url;
					}),
					prompt: {
						start: 'what would you like to post?',
						retry: 'upload a photo or provide a link.'
					}
				}
			]
		});
	}

	async exec(message, { url, title }) {
		if (message.guild.id !== '524672414261444623') return;

		request({
			url: 'https://api.imgur.com/3/upload',
			method: 'POST',
			headers: { Authorization: `Client-ID ${process.env.IMGUR}` },
			form: {
				type: 'url',
				image: url,
				title,
				album: this.client.settings.get('global', 'deletehash', process.env.IMGUR_DELETEHASH)
			}
		}, async (error, response, body) => {
			if (error) {
				console.error(error);
				return message.util.send(JSON.stringify(error), { code: 'json' });
			}
			if (response.statusCode === 200) {
				const author = { discord_user_id: message.author.id };
				const parsed = JSON.parse(body);
				await firebase.ref('memes').child(parsed.data.id).update(Object.assign(author, parsed.data));
				const embed = this.client.util.embed()
					.setColor(0x10ffc1)
					.setAuthor(message.author.tag, message.author.displayAvatarURL())
					.setTitle(`${title} - ${parsed.data.id}`)
					.setURL(parsed.data.link)
					.setThumbnail(parsed.data.link)
					.setFooter(parsed.data.deletehash)
					.setTimestamp();
				return message.util.send({ embed });
			}
			return message.util.send(JSON.stringify(body), { code: 'json' });
		});
	}
}

module.exports = AddMemeCommand;
