const { Command, Flag } = require("discord-akairo");
const { mongodb } = require("../../struct/Database");
const Resolver = require("../../struct/Resolver");

class LinkClanCommand extends Command {
	constructor() {
		super("link-clan", {
			aliases: ["link-clan", "save-clan"],
			category: "hidden",
			channel: "guild",
			clientPermissions: ["EMBED_LINKS", "USE_EXTERNAL_EMOJIS", "ADD_REACTIONS"],
			description: {
				content: "Saves a clan to your discord account.",
				usage: "<tag> [member]",
				examples: ["#9Q92C8R20", "#9Q92C8R20 Suvajit"]
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.clan(args);
				if (resolved.status !== 200) {
					if (resolved.status === 404) {
						return Flag.fail(resolved.embed.description);
					}
					await message.util.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			},
			prompt: {
				start: "What is your clan tag?",
				retry: (msg, { failure }) => failure.value
			}
		};

		const member = yield {
			type: "member",
			default: message => message.member
		};

		return { data, member };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data, member }) {
		await mongodb.db("clashperk").collection("linkedclans")
			.updateOne({ user: member.id }, {
				$set: {
					user: member.id,
					tag: data.tag,
					createdAt: new Date(),
					hidden: false
				}
			}, { upsert: true });

		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				"",
				"If you don't provide the tag for other lookup comamnds, the Bot will use the last one you linked.",
				`For Examples **\u200b${prefix}clan** will return the info of *${data.name} (${data.tag})*.`,
				`As well as **\u200b${prefix}thcompo** will return the townhall composition for the same clan (works with other comamnds too).`
			]);
		return message.util.send({ embed });
	}
}

module.exports = LinkClanCommand;
