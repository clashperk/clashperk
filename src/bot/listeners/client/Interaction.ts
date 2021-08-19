import { CommandInteractionOption, Interaction, PermissionResolvable, TextChannel } from 'discord.js';
import { Listener, Command, Flag } from 'discord-akairo';
import { Messages, Settings } from '../../util/Constants';

const EPHEMERAL_COMMANDS = ['help', 'invite', 'stats', 'whois'];

interface Parsed {
	type: string;
	value?: string;
	raw: string;
	key?: string;
}

export class InteractionOptionParser {
	public flagWords: string[];
	public optionFlagWords: string[];

	public constructor({
		flagWords = [],
		optionFlagWords = []
	} = {}) {
		this.flagWords = flagWords;
		this.optionFlagWords = optionFlagWords;
	}

	private parseOptions(options: CommandInteractionOption[], all: Parsed[] = [], phrases: Parsed[] = [], flags: Parsed[] = [], optionFlags: Parsed[] = []): Parsed[][] {
		if (!options.length) return [all, phrases, flags, optionFlags];

		const top = options.shift();
		if (!top) return [all, phrases, flags, optionFlags];

		if (!top.value) {
			phrases.push({ type: 'Phrase', value: top.name, raw: `${top.name} ` });
			all.push({ type: 'Phrase', value: top.name, raw: `${top.name} ` });
		}

		if (typeof top.value === 'boolean') {
			if (top.value) {
				if (this.flagWords.includes(`--${top.name}`)) {
					all.push({ type: 'Flag', key: `--${top.name}`, raw: `--${top.name} ` });
					flags.push({ type: 'Flag', key: `--${top.name}`, raw: `--${top.name} ` });
				} else {
					phrases.push({ type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` });
					all.push({ type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` });
				}
			}
		} else if (['true', 'false'].includes(top.value as string)) {
			if (top.value === 'true') {
				if (this.flagWords.includes(`--${top.name}`)) {
					all.push({ type: 'Flag', key: `--${top.name}`, raw: `--${top.name} ` });
					flags.push({ type: 'Flag', key: `--${top.name}`, raw: `--${top.name} ` });
				} else {
					phrases.push({ type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` });
					all.push({ type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` });
				}
			}
		} else if (top.value) {
			if (this.optionFlagWords.includes(`--${top.name}`)) {
				optionFlags.push({ type: 'OptionFlag', value: `${this.trim(top.value)}`, key: `--${top.name}`, raw: `--${top.name} "${this.trim(top.value)}" ` });
				all.push({ type: 'OptionFlag', value: `${this.trim(top.value)}`, key: `--${top.name}`, raw: `--${top.name} "${this.trim(top.value)}" ` });
			} else {
				// name
				const phraseName = { type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` };
				// value
				const phraseValue = { type: 'Phrase', value: `${this.trim(top.value)}`, raw: `"${this.trim(top.value)}" ` };

				phrases.push(...[phraseName, phraseValue]);
				all.push(...[phraseName, phraseValue]);
			}
		}

		if (top.options?.length) {
			[all, phrases, flags, optionFlags] = this.parseOptions(top.options, all, phrases, flags, optionFlags);
		}

		return this.parseOptions(options, all, phrases, flags, optionFlags);
	}

	public parse(args: CommandInteractionOption[]) {
		const [all, phrases, flags, optionFlags] = this.parseOptions(args);
		return { all, phrases, flags, optionFlags };
	}

	private trim(value: string | number) {
		return value.toString().trim();
	}
}

export default class InteractionListener extends Listener {
	public constructor() {
		super('interaction', {
			emitter: 'client',
			category: 'client',
			event: 'interactionCreate'
		});
	}

	public exec(interaction: Interaction) {
		this.commandInteraction(interaction);
		this.contextInteraction(interaction);
		this.componentInteraction(interaction);
	}

	private async contextInteraction(interaction: Interaction) {
		if (!interaction.isContextMenu()) return;
		if (this.inhibitor(interaction)) return;
		if (!interaction.inGuild()) return;

		const command = this.client.commandHandler.findCommand(interaction.commandName);
		if (!command) return; // eslint-disable-line

		if (!interaction.channel) {
			return interaction.reply({
				content: `I\'m missing **Send Messages** permission in this channel.`,
				ephemeral: true
			});
		}

		const permissions = (interaction.channel as TextChannel).permissionsFor(this.client.user!)!
			.missing(['SEND_MESSAGES', 'VIEW_CHANNEL'])
			.map(perm => {
				if (perm === 'VIEW_CHANNEL') return 'Read Messages';
				return perm.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});

		if (permissions.length) {
			return interaction.reply({
				content: `I\'m missing **${permissions.join('** and **')}** permission${permissions.length > 1 ? 's' : ''} in this channel.`,
				ephemeral: true
			});
		}

		await interaction.deferReply({ ephemeral: EPHEMERAL_COMMANDS.includes(interaction.commandName.toLowerCase()) });
		if (
			(command.clientPermissions) &&
			(command.clientPermissions as PermissionResolvable[]).includes('USE_EXTERNAL_EMOJIS') &&
			!(interaction.channel as TextChannel).permissionsFor(interaction.guild!.roles.everyone).has('USE_EXTERNAL_EMOJIS')
		) {
			await interaction.followUp({
				content: 'You must enable `Use External Emojis` permission for @everyone role to use slash commands.',
				allowedMentions: { parse: ['users'] }
			});
		}

		const options: CommandInteractionOption = interaction.targetType === 'MESSAGE'
			? { name: 'message', value: interaction.options.getMessage('message')?.content ?? '', type: 'STRING' }
			: { name: 'user', value: interaction.options.getUser('user')!.id, type: 'USER' };
		return this.handleInteraction(interaction, command, [options], false);
	}

	private async componentInteraction(interaction: Interaction) {
		if (!interaction.isButton() && !interaction.isSelectMenu()) return;
		if (this.inhibitor(interaction)) return;

		const userIds = this.client.components.get(interaction.customId);
		if (userIds?.length && userIds.includes(interaction.user.id)) return;
		if (userIds?.length && !userIds.includes(interaction.user.id)) {
			this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_BLOCKED' });
			return interaction.reply({ content: Messages.COMPONENT.UNAUTHORIZED, ephemeral: true });
		}

		if (this.client.components.has(interaction.customId)) return;
		if ((await this.client.automaton.exec(interaction))) return;

		this.client.logger.debug(`[${interaction.guild!.name}/${interaction.user.tag}]`, { label: 'COMPONENT_EXPIRED' });
		await interaction.update({ components: [] });
		return interaction.followUp({ content: Messages.COMPONENT.EXPIRED, ephemeral: true });
	}

	private async commandInteraction(interaction: Interaction) {
		if (!interaction.isCommand()) return;
		if (this.inhibitor(interaction)) return;

		const command = this.client.commandHandler.findCommand(interaction.commandName);
		if (!command) return; // eslint-disable-line

		if (!interaction.channel) {
			return interaction.reply({
				content: `I\'m missing **Send Messages** permission in this channel.`,
				ephemeral: true
			});
		}

		const permissions = (interaction.channel as TextChannel).permissionsFor(this.client.user!)!
			.missing(['SEND_MESSAGES', 'VIEW_CHANNEL'])
			.map(perm => {
				if (perm === 'VIEW_CHANNEL') return 'Read Messages';
				return perm.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});

		if (permissions.length) {
			return interaction.reply({
				content: `I\'m missing **${permissions.join('** and **')}** permission${permissions.length > 1 ? 's' : ''} in this channel.`,
				ephemeral: true
			});
		}

		await interaction.deferReply({ ephemeral: EPHEMERAL_COMMANDS.includes(command.id) });
		if (
			(command.clientPermissions) &&
			(command.clientPermissions as PermissionResolvable[]).includes('USE_EXTERNAL_EMOJIS') &&
			!(interaction.channel as TextChannel).permissionsFor(interaction.guild!.roles.everyone).has('USE_EXTERNAL_EMOJIS')
		) {
			await interaction.followUp({
				content: 'You must enable `Use External Emojis` permission for @everyone role to use slash commands.',
				allowedMentions: { parse: ['users'] }
			});
		}
		return this.handleInteraction(interaction, command, [...interaction.options.data], false);
	}

	private inhibitor(interaction: Interaction) {
		if (!interaction.inGuild()) return true;

		const guilds = this.client.settings.get<string[]>('global', Settings.GUILD_BLACKLIST, []);
		if (guilds.includes(interaction.guildId)) return true;

		const users = this.client.settings.get<string[]>('global', Settings.USER_BLACKLIST, []);
		if (users.includes(interaction.user.id)) return true;
		return false;
	}

	private contentParser(command: Command, content: string | CommandInteractionOption[]) {
		if (Array.isArray(content)) {
			const contentParser = new InteractionOptionParser({
				// @ts-expect-error
				flagWords: command.contentParser.flagWords,
				// @ts-expect-error
				optionFlagWords: command.contentParser.optionFlagWords
			});
			return contentParser.parse(content);
		}
		// @ts-expect-error
		return command.contentParser.parse(content);
	}

	private async handleInteraction(interaction: Interaction, command: Command, content: string | CommandInteractionOption[], ignore = false): Promise<unknown> {
		if (!ignore) {
			// @ts-expect-error
			if (await this.client.commandHandler.runPostTypeInhibitors(interaction, command)) return;
		}
		const parsed = this.contentParser(command, content);
		// @ts-expect-error
		const args = await command.argumentRunner.run(interaction, parsed, command.argumentGenerator);
		if (Flag.is(args, 'cancel')) {
			return this.client.commandHandler.emit('commandCancelled', interaction, command);
		} else if (Flag.is(args, 'continue')) {
			const continueCommand = this.client.commandHandler.modules.get(args.command)!;
			return this.handleInteraction(interaction, continueCommand, args.rest, args.ignore);
		}

		// @ts-expect-error
		return this.client.commandHandler.runCommand(interaction, command, args);
	}
}
