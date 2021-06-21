import { Collection, CommandInteractionOption, Interaction, TextChannel } from 'discord.js';
import { Listener, Command, Flag } from 'discord-akairo';

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
				optionFlags.push({ type: 'OptionFlag', value: `${top.value}`, key: `--${top.name}`, raw: `--${top.name} "${top.value}" ` });
				all.push({ type: 'OptionFlag', value: `${top.value}`, key: `--${top.name}`, raw: `--${top.name} "${top.value}" ` });
			} else {
				// name
				const phraseName = { type: 'Phrase', value: `${top.name}`, raw: `--${top.name} ` };
				// value
				const phraseValue = { type: 'Phrase', value: `${top.value}`, raw: `"${top.value}" ` };

				phrases.push(...[phraseName, phraseValue]);
				all.push(...[phraseName, phraseValue]);
			}
		}

		if (top.options?.size) {
			[all, phrases, flags, optionFlags] = this.parseOptions(Array.from(top.options.values()), all, phrases, flags, optionFlags);
		}

		return this.parseOptions(options, all, phrases, flags, optionFlags);
	}

	public parse(args: Collection<string, CommandInteractionOption>) {
		const [all, phrases, flags, optionFlags] = this.parseOptions(Array.from(args.values()));
		return { all, phrases, flags, optionFlags };
	}
}

export default class InteractionListener extends Listener {
	public constructor() {
		super('interaction', {
			emitter: 'client',
			event: 'interaction',
			category: 'client'
		});
	}

	public async exec(interaction: Interaction) {
		if (!interaction.isCommand()) return;

		const command = this.client.commandHandler.findCommand(interaction.commandName);
		if (!command) return; // eslint-disable-line

		const permissions = (interaction.channel as TextChannel).permissionsFor(this.client.user!)!
			.missing(['SEND_MESSAGES', 'VIEW_CHANNEL'])
			.map(perm => {
				if (perm === 'VIEW_CHANNEL') return 'Read Messages';
				return perm.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});

		if (permissions.length) {
			return interaction.reply({
				content: `Missing **${permissions.join('** and **')}** permission${permissions.length > 1 ? 's' : ''}.`,
				ephemeral: true
			});
		}

		await interaction.defer({ ephemeral: ['help', 'invite'].includes(command.id) });
		return this.handleInteraction(interaction, command, interaction.options, false);
	}

	private contentParser(command: Command, content: Collection<string, CommandInteractionOption> | string) {
		if (content instanceof Collection) {
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

	private async handleInteraction(interaction: Interaction, command: Command, content: string | Collection<string, CommandInteractionOption>, ignore = false): Promise<unknown> {
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
