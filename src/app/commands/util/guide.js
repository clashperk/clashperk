const { Command } = require('discord-akairo');

class GuideCommand extends Command {
	constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows information about how to use bot.' }
		});
	}

	async exec(message) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setTitle('Guide')
			.addField('Setup', [
				'ClashPerk requires the following permissions to be usable:',
				'- `Read Messages`',
				'- `Add Reactions`',
				'- `Read Message History`',
				'- `Send Messages`',
				'- `Embed Links`',
				'- `Use External Emojis`',
				'- `Attach Files`',
				'',
				'To setup the tracker, create a channel for it.',
				`Then, use the \`${prefix}start <tag> [channel] [color]\` command to set it to that channel.`,
				'This command requires the `Manage Guild` permission to be usable.',
				'This `channel` and `color` are totally optional.',
				'If you don\'t provide a `channel` & `color`, it picks the current channel and this (#5970C1) color.',
				'If you want to set a \`color\`, please use the full format (must mention a `channel` before `color`) of the command.',
				'',
				`To edit the color of embed, use the \`${prefix}edit <tag> <color>\` command.`
			])
			.addField('Stop', [
				`To stop tracking for a specific clan, use the \`${prefix}stop <tag>\` command.`,
				`To stop tracking all clans, use the \`${prefix}stop-all\` command.`,
				'This command requires the `Manage Guild` permission to be usable.'
			])
			.addField('Lookup', [
				`To view tracking details & settings on your server, use the \`${prefix}tracking\` command.`,
				`To view details of a player, use the \`${prefix}player <tag>\` command.`,
				`To view details of a clan, use the \`${prefix}clan <tag>\` command.`,
				`To search clans by name, use the \`${prefix}clansearch <name>\` command.`,
				`To view details of of your TH compositions, use the \`${prefix}th-compo <tag>\` command.`,
				`To view last 10 war log of your clan, use the \`${prefix}warlog <tag>\` command.`,
				'',
				`To view the list of your members, use the \`${prefix}members <tag>\` command.`,
				`To short by TH level, \`${prefix}members <tag> th\` command.`,
				`To view specific town hall, \`${prefix}members <tag> th <th level>\` command.`,
				`Example: \`${prefix}members #8QU8J9LP th 10\` - only TH 10's will be displayed.`

			])
			.addField('Profile', [
				`To link player to discord, use the \`${prefix}link-player <tag> [optional member]\` command.`,
				`To link clan to discord, use the \`${prefix}link-player <tag> [optional member]\` command.`,
				`To view info about your profile use the \`${prefix}profile [optional member]\` command.`,
				`To view info about your clan use the \`${prefix}myclan [optional member]\` command.`
			])
			.addField('Other', [
				`Use the \`${prefix}restrict <user>\` to disallow someone from using the clash commands on your server.`,
				'This command requires the `Manage Guild` permission to be usable.',
				'You can use it again on the same user to remove them from the blacklist.',
				'',
				`To view settings of your guild, use the \`${prefix}settings\` command.`,
				'',
				`Use the \`${prefix}prefix <prefix>\` command to change prefix.`,
				'This command requires the `Manage Guild` permission to be usable.',
				'You can also mention the bot to use commands.',
				'',
				`For more information about ClashPerk, check out \`${prefix}about\` and \`${prefix}stats\`.`,
				`Invite ClashPerk to your server with \`${prefix}invite\`.`
			]);

		return message.util.send({ embed });
	}
}

module.exports = GuideCommand;
