const { Command } = require("discord-akairo");

class RestrictCommand extends Command {
	constructor() {
		super("restrict", {
			aliases: ["restrict", "unrestrict"],
			category: "config",
			cooldown: 1000,
			channel: "guild",
			userPermissions: ["MANAGE_GUILD"],
			quoted: false,
			description: {
				content: "Restricts or unrestricts someone from using commands.",
				usage: "<member>",
				examples: ["@Suvajit", "444432489818357760"]
			},
			args: [
				{
					id: "member",
					match: "content",
					type: "member",
					prompt: {
						start: "Which user do you want to restrict or unrestrict?",
						retry: "Please provide a valid member!"
					}
				}
			]
		});
	}

	async exec(message, { member }) {
		if (member.id === message.author.id) return;
		const restrict = this.client.settings.get(message.guild, "restrict", []);

		if (restrict.includes(member.id)) {
			const index = restrict.indexOf(member.id);
			restrict.splice(index, 1);
			await this.client.settings.set(message.guild, "restrict", restrict);

			return message.util.send({
				embed: {
					description: `**${member.user.tag}** has been removed from the restriction.`,
					color: 3093046
				}
			});
		}
		restrict.push(member.id);
		await this.client.settings.set(message.guild, "restrict", restrict);

		return message.util.send({
			embed: {
				description: `**${member.user.tag}** has been restricted.`,
				color: 3093046
			}
		});
	}
}

module.exports = RestrictCommand;
