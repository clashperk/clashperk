/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { APIInteraction, InteractionType, APIApplicationCommandInteractionData, APIApplicationCommandInteractionDataOption } from 'discord-api-types/v8';
import { TextChannel, User, Guild, GuildMember, APIMessage, Collection, MessageOptions, MessageAdditions, StringResolvable, Message, WebhookClient } from 'discord.js';
import Client from './Client';

export class CommandUtil {
	public shouldEdit: boolean;
	public message: Interaction;
	public lastResponse?: Message;

	public constructor(message: Interaction) {
		this.message = message;
		this.shouldEdit = false;
		// @ts-expect-error
		this.lastResponse = null;
	}

	public addMessage() {
		// TODO
	}

	public setLastResponse(message: Message) {
		this.shouldEdit = true;
		return this.lastResponse = message;
	}

	public setEditable() {
		// TODO
	}

	public async send(content: StringResolvable, options?: MessageOptions | MessageAdditions): Promise<Message | Message[]> {
		const transformedOptions = (this.constructor as typeof CommandUtil).transformOptions(content, options);
		if (!this.lastResponse?.deleted && this.shouldEdit) {
			return this.message.edit(this.lastResponse!.id, transformedOptions);
		}

		const sent = await this.message.resend(transformedOptions);
		this.setLastResponse(sent);
		return sent;
	}

	public static transformOptions(content: any, options?: any) {
		if (content?.hasOwnProperty('embed')) {
			content.embeds = [content.embed];
		} else if (options?.hasOwnProperty('embed')) {
			options.embeds = [options.embed];
		}

		const transformedOptions: any = APIMessage.transformOptions(content, options, {}, true);
		if (!transformedOptions.content) transformedOptions.content = '\u200b';
		if (!transformedOptions.embeds?.length) transformedOptions.embeds = [];
		return transformedOptions;
	}
}

export default class Interaction {
	public id: string;
	public guild: Guild;
	public author!: User;
	public token: string;
	public client!: Client;
	public channel: TextChannel;
	public member!: GuildMember;
	public type: InteractionType;
	public commandUtils = new Collection();
	public data?: APIApplicationCommandInteractionData;

	public constructor(client: Client, data: APIInteraction) {
		this.id = data.id;

		this.data = data.data;

		this.type = data.type;

		this.token = data.token;

		this.guild = client.guilds.cache.get(data.guild_id) as Guild;

		this.channel = client.channels.cache.get(data.channel_id) as TextChannel;

		Object.defineProperty(this, 'client', { value: client, writable: true });
	}

	public get util() {
		if (this.commandUtils.has(this.id)) {
			return this.commandUtils.get(this.id);
		}
		const util = new CommandUtil(this);
		this.commandUtils.set(this.id, util);
		const timeoutId: NodeJS.Timeout = setTimeout(() => {
			this.commandUtils.delete(this.id);
			return clearTimeout(timeoutId);
		}, 5 * 60 * 1000);
		return util;
	}

	public get name() {
		return this.data?.name ?? 'uwu';
	}

	public get isInteraction() {
		return Boolean(this.type === 2);
	}

	public get options() {
		return this.data?.options ?? [];
	}

	public async parse(data: APIInteraction) {
		if (this.client.users.cache.has(data.member.user.id)) {
			this.author = this.client.users.cache.get(data.member.user.id)!;
		} else {
			this.author = await this.client.users.fetch(data.member.user.id);
		}
		if (this.guild.members.cache.has(data.member.user.id)) {
			this.member = this.guild.members.cache.get(data.member.user.id)!;
		} else {
			this.member = await this.guild.members.fetch(data.member.user.id);
		}
		return Promise.resolve(this);
	}

	public async resend(data: any) {
		return new WebhookClient(this.client.user!.id, this.token)
			.send(data).then(msg => this.channel.messages.add(msg));
	}

	public edit(id: string, data: any) {
		// @ts-expect-error
		return this.client.api.webhooks(this.client.user.id, this.token)
			.messages[id]
			.patch({ auth: false, data })
			.then((msg: any) => this.channel.messages.add(msg));
	}
}

export class InteractionParser {
	public flagWords: string[];
	public optionFlagWords: string[];

	public constructor({
		flagWords = [],
		optionFlagWords = []
	} = {}) {
		this.flagWords = flagWords;
		this.optionFlagWords = optionFlagWords;
	}

	private parseOptions(
		options: APIApplicationCommandInteractionDataOption[],
		all: any[] = [],
		phrases: any[] = [],
		flags: any[] = [],
		optionFlags: any[] = []
	): any[] {
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

		if (top.options?.length) {
			[all, phrases, flags, optionFlags] = this.parseOptions(top.options, all, phrases, flags, optionFlags);
		}

		return this.parseOptions(options, all, phrases, flags, optionFlags);
	}

	public parse(args: APIApplicationCommandInteractionDataOption[]) {
		const [all, phrases, flags, optionFlags] = this.parseOptions(args);
		return { all, phrases, flags, optionFlags };
	}
}
