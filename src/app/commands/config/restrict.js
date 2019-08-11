const { Command } = require('discord-akairo');

class RestrictCommand extends Command {
	constructor() {
		super('restrict', {
			aliases: ['restrict', 'unrestrict'],
			category: 'config',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			quoted: false,
			args: [
				{
					id: 'member',
					match: 'content',
					type: 'member',
					prompt: {
						start: 'which user do you want to restrict or unrestrict?',
						retry: 'please provide a valid user.'
					}
				}
			],
			description: {
				content: 'Restricts or unrestricts someone from using sensitive commands.',
				usage: '<user>',
				examples: ['@BadPerson', 'someone#1234']
			}
		});
	}

	async exec(message, { member }) {
		if (member.id === message.author.id) return;
		const restrict = this.client.settings.get(message.guild, 'restrict', []);

		if (restrict.includes(member.id)) {
			const index = restrict.indexOf(member.id);
			restrict.splice(index, 1);
			await this.client.settings.set(message.guild, 'restrict', restrict);

			return message.util.send(`**${member.user.tag}** has been removed from the restriction.`);
		}
		restrict.push(member.id);
		await this.client.settings.set(message.guild, 'restrict', restrict);

		return message.util.send(`**${member.user.tag}** has been restricted from using sensitive commands.`);
	}
}

module.exports = RestrictCommand;
