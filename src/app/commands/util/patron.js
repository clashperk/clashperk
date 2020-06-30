const { Command } = require("discord-akairo");
const { firestore } = require("../../struct/Database");
const { oneLine } = require("common-tags");

class PatronCommand extends Command {
	constructor() {
		super("patron", {
			aliases: ["patron", "donate", "patreon"],
			category: "util",
			clientPermissions: ["EMBED_LINKS"],
			cooldown: 1000,
			description: {
				content: "Get info about the our Patreon."
			}
		});
	}

	async exec(message) {
		const patrons = await this.patrons();
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor("ClashPerk", this.client.user.displayAvatarURL(), "https://www.patreon.com/clashperk")
			.setDescription([
				oneLine`Help us with our hosting related expenses. Any help is beyond appreciated.`,
				"",
				"**Benefits**",
				"• Faster updates and less cooldown",
				"• Claim more than 2 clans (unlimited)",
				"• Unlocks all patron only commands",
				"• Patron role on our support discord",
				"",
				"[Become a Patron](https://www.patreon.com/clashperk)",
				"",
				"**Our Current Patrons**",
				patrons.map(name => `• ${name}`).join("\n")
			]);

		return message.util.send({ embed });
	}

	async patrons(patrons = []) {
		await firestore.collection("patrons")
			.get()
			.then(snapshot => {
				snapshot.forEach(snap => {
					const data = snap.data();
					if (data.active) patrons.push(data.name);
				});
				if (!snapshot.size) patrons = null;
			});
		return patrons;
	}
}

module.exports = PatronCommand;
