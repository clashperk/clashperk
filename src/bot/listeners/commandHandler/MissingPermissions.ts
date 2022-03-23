import { CommandInteraction, TextChannel, PermissionString, User } from 'discord.js';
import { Listener, Command } from '../../lib';

export default class MissingPermissionsListener extends Listener {
	public constructor() {
		super('missingPermissions', {
			event: 'missingPermissions',
			emitter: 'commandHandler',
			category: 'commandHandler'
		});
	}

	public exec(interaction: CommandInteraction, command: Command, type: 'user' | 'client', missing: PermissionString[]) {
		const text = {
			client: () => {
				const name = this.missingPermissions(interaction.channel as TextChannel, this.client.user!, missing);
				return `I'm missing ${name} to execute that command.`;
			},
			user: () => {
				const name = this.missingPermissions(interaction.channel as TextChannel, interaction.user, missing);
				return `You are missing ${name} to use that command.`;
			}
		}[type];

		const label = interaction.guild ? `${interaction.guild.name}/${interaction.user.tag}` : `${interaction.user.tag}`;
		this.client.logger.debug(`${command.id} ~ ${type}Permissions`, { label });

		return interaction.reply({ content: text(), ephemeral: true });
	}

	private missingPermissions(channel: TextChannel, user: User, permissions: PermissionString[]) {
		const missingPerms = channel
			.permissionsFor(user)!
			.missing(permissions)
			.map((name) => {
				if (name === 'VIEW_CHANNEL') return '`Read Messages`';
				if (name === 'SEND_TTS_MESSAGES') return '`Send TTS Messages`';
				if (name === 'USE_VAD') return '`Use VAD`';
				if (name === 'MANAGE_GUILD') return '`Manage Server`';
				return `\`${name
					.replace(/_/g, ' ')
					.toLowerCase()
					.replace(/\b(\w)/g, (char) => char.toUpperCase())}\``;
			});

		return missingPerms.length > 1
			? `${missingPerms.slice(0, -1).join(', ')} and ${missingPerms.slice(-1)[0]} permissions`
			: `${missingPerms[0]} permission`;
	}
}
