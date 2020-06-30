const { Command, Flag } = require("discord-akairo");
const { MessageEmbed } = require("discord.js");
const { mongodb } = require("../../struct/Database");
const { MODES } = require("../../util/constants");
const Resolver = require("../../struct/Resolver");

class DonationLogCommand extends Command {
	constructor() {
		super("donationlog", {
			aliases: ["donationlog", "start", "setup-donationlog"],
			category: "setup-hidden",
			channel: "guild",
			userPermissions: ["MANAGE_GUILD"],
			clientPermissions: ["ADD_REACTIONS", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS"],
			description: {
				content: "Setup donation log in a channel.",
				usage: "<clanTag> [channel/color]",
				examples: ["#8QU8J9LP", "#8QU8J9LP #donations #5970C1", "#8QU8J9LP #5970C1 #donations"]
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
			},
			unordered: false
		};

		const channel = yield {
			type: "textChannel",
			unordered: [1, 2],
			default: message => message.channel
		};

		const color = yield {
			type: "color",
			unordered: [1, 2],
			default: 5861569
		};

		return { data, channel, color };
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild)) return 3000;
		return 10000;
	}

	async exec(message, { data, channel, color }) {
		const clans = await this.clans(message);
		const max = this.client.patron.get(message.guild.id, "limit", 2);
		if (clans.length >= max && !clans.map(clan => clan.tag).includes(data.tag)) {
			const embed = Resolver.limitEmbed();
			return message.util.send({ embed });
		}

		const code = ["CP", message.guild.id.substr(-2)].join("");
		const clan = clans.find(clan => clan.tag === data.tag) || { verified: false };
		if (!clan.verified && !data.description.toUpperCase().includes(code)) {
			const embed = Resolver.verifyEmbed(data, code);
			return message.util.send({ embed });
		}

		const permissions = ["ADD_REACTIONS", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "VIEW_CHANNEL"];
		if (!channel.permissionsFor(channel.guild.me).has(permissions, false)) {
			return message.util.send(`I\'m missing ${this.missingPermissions(channel, this.client.user, permissions)} to run that command.`);
		}

		const id = await this.client.storage.register({
			mode: MODES[1],
			guild: message.guild.id,
			channel: channel.id,
			tag: data.tag,
			name: data.name,
			color,
			patron: this.client.patron.get(message.guild.id, "guild", false)
		});

		await this.client.cacheHandler.add(id, {
			mode: MODES[1],
			guild: message.guild.id,
			tag: data.tag
		});

		const embed = new MessageEmbed()
			.setAuthor(`${data.name} ${data.tag}`, data.badgeUrls.small)
			.setDescription(`Started tracking in ${channel} (${channel.id})`)
			.setColor(color);
		return message.util.send({ embed });
	}

	missingPermissions(channel, user, permissions) {
		const missingPerms = channel.permissionsFor(user).missing(permissions)
			.map(str => {
				if (str === "VIEW_CHANNEL") return "`Read Messages`";
				return `\`${str.replace(/_/g, " ").toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}\``;
			});

		return missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(", ")} and ${missingPerms.slice(-1)[0]}`
			: missingPerms[0];
	}

	async clans(message) {
		const collection = await mongodb.db("clashperk")
			.collection("clanstores")
			.find({ guild: message.guild.id })
			.toArray();
		return collection;
	}
}

module.exports = DonationLogCommand;
