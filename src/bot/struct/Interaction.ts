/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { APIInteraction, InteractionType, APIApplicationCommandInteractionData, APIApplicationCommandInteractionDataOption } from 'discord-api-types/v8';
import { TextChannel, User, Guild, GuildMember, APIMessage, Collection, MessageOptions, MessageAdditions, StringResolvable, Message } from 'discord.js';
import Client from './Client';

export class CommandUtil {
	public message: Interaction;
	public shouldEdit: boolean;
	public lastResponse?: Message;

	public constructor(message: Interaction) {
		this.message = message;
		this.shouldEdit = false;

		// @ts-expect-error
		this.lastResponse = null;
	}

	public setLastResponse(message: Message | Message[]) {
		if (Array.isArray(message)) {
			this.lastResponse = message.slice(-1)[0];
		} else {
			this.lastResponse = message;
		}

		return this.lastResponse;
	}

	public setEditable(state: boolean) {
		this.shouldEdit = Boolean(state);
		return this;
	}

	public async send(content: StringResolvable, options?: MessageOptions | MessageAdditions): Promise<Message | Message[]> {
		const transformedOptions = (this.constructor as typeof CommandUtil).transformOptions(content, options);
		const hasFiles = transformedOptions?.files?.length > 0
			|| transformedOptions?.embeds.reduce((p: any, c: any) => p + c?.files?.length ?? 0, 0) > 0; // eslint-disable-line

		if (this.shouldEdit && !hasFiles && !this.lastResponse?.deleted && !this.lastResponse?.attachments.size) {
			return this.edit(transformedOptions);
		}

		const sent = await this.message.reply(transformedOptions);
		const lastSent = this.setLastResponse(sent);
		this.setEditable(!lastSent.attachments.size);
		return sent;
	}

	private async sendNew(content: StringResolvable, options: MessageOptions | MessageAdditions) {
		const sent = await this.message.reply((this.constructor as typeof CommandUtil).transformOptions(content, options));
		const lastSent = this.setLastResponse(sent);
		this.setEditable(!lastSent.attachments.size);
		return sent;
	}

	private edit(data: any) {
		return this.message.edit(this.lastResponse!.id, data);
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

	public ack() {
		// @ts-expect-error
		return this.client.api.interactions(this.id, this.token).callback.post({ data: { type: 5 } });
	}

	public reply(data: any) {
		// @ts-expect-error
		return this.client.api.webhooks(this.client.user.id, this.token)
			.post({
				auth: false,
				data: { ...data }
			}).then((msg: any) => this.channel.messages.add(msg));
	}

	public edit(id: string, data: any) {
		// @ts-expect-error
		return this.client.api.webhooks(this.client.user.id, this.token)
			.messages[id]
			.patch({
				auth: false,
				data: { ...data }
			}).then((msg: any) => this.channel.messages.add(msg));
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
