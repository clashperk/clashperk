import { Listener, Command } from 'discord-akairo';
import { TextChannel, Message } from 'discord.js';

interface Text {
	[key: string]: string | undefined;
}

const texts: Text = {
	beta: 'This command is still in beta, contact support for early access.',
	guild: 'You must be in a guild to use this command.',
	restrict: 'You can\'t use this command because you have been restricted.',
	textCommand: [
		'**Text-based commands are no longer supported. Please use slash commands!**',
		'',
		'At the end of April 2022, access to the message content will be restricted and bots will not be able to read our text messages. Read more about this > <https://support-dev.discord.com/hc/en-us/articles/4404772028055>',
		'',
		'Discord wants us to move to the new slash commands. So I request everyone start using slash commands and get used to it. Know more about slash commands > <https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ>',
		'',
		'Thank you!'
	].join('\n')
};

export default class CommandBlockedListener extends Listener {
	public constructor() {
		super('commandBlocked', {
			event: 'commandBlocked',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(message: Message, command: Command, reason: string) {
		const msg = texts[reason];
		const label = message.guild ? `${message.guild.name}/${message.author.tag}` : `${message.author.tag}`;
		this.client.logger.debug(`${command.id} ~ ${reason}`, { label });

		if (reason === 'beta' && message.interaction && msg) {
			return message.util!.send(msg);
		}

		if (!msg) return;
		if (message.guild ? (message.channel as TextChannel).permissionsFor(this.client.user!)?.has('SEND_MESSAGES') : true) {
			return message.channel.send(msg);
		}
	}
}
