import { COLLECTIONS, EMBEDS, Op, SETTINGS, Util } from '../../util/Constants';
import { Command, Argument, PrefixSupplier } from 'discord-akairo';
import { Message, GuildMember, TextChannel } from 'discord.js';
import { BitField } from '@clashperk/node';
import { Clan } from 'clashofclans.js';

export default class LinkClanCommand extends Command {
	public constructor() {
		super('link-clan', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
			description: {},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getClan(msg, tag)
				},
				{
					'id': 'parsed',
					'match': 'rest',
					'type': Argument.union('member', 'textChannel'),
					'default': (msg: Message) => msg.member
				}
			]
		});
	}

	public async exec(message: Message, { data, parsed }: { data: Clan; parsed: GuildMember | TextChannel }) {
		if (parsed instanceof TextChannel) {
			if (!message.member!.permissions.has('MANAGE_GUILD')) {
				return message.util!.send('You are missing `Manage Server` permission to use this command.');
			}
			if (!await this.enforceSecurity(message, data)) return;

			const store = await this.client.storage.collection.findOne({ channels: parsed.id });

			if (store) {
				return message.util!.send(
					// eslint-disable-next-line @typescript-eslint/no-base-to-string
					`**${store.name} (${store.tag})** is already linked to ${parsed.toString()}`
				);
			}

			const { upsertedCount, upsertedId } = await this.client.storage.collection.updateOne(
				{ guild: message.guild!.id, tag: data.tag },
				{
					$set: {
						name: data.name, tag: data.tag,
						paused: false, verified: true, active: true,
						guild: message.guild!.id, patron: this.client.patrons.get(message.guild!.id)
					},
					$push: {
						channels: parsed.id
					},
					$bit: {
						flag: { or: BitField.CHANNEL_LINKED }
					},
					$min: {
						createdAt: new Date()
					}
				}, { upsert: true }
			);

			if (upsertedCount) {
				await this.client.rpcHandler.add(upsertedId._id.toHexString(), {
					op: Op.CHANNEL_LINKED,
					guild: message.guild!.id,
					tag: data.tag
				});
			}

			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			return message.util!.send(`Successfully linked **${data.name} (${data.tag})** to ${parsed.toString()}`);
		}

		if (parsed.user.bot) return message.util!.send('Bots can\'t link accounts.');
		await this.client.db.collection(COLLECTIONS.LINKED_CLANS)
			.updateOne({ user: parsed.id }, {
				$set: {
					tag: data.tag,
					user: parsed.id,
					createdAt: new Date()
				}
			}, { upsert: true });

		await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne({ user: parsed.id }, {
				$set: {
					clan: {
						tag: data.tag,
						name: data.name
					},
					user_tag: parsed.user.tag
				},
				$setOnInsert: {
					entries: [],
					createdAt: new Date()
				}
			}, { upsert: true });

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`Linked **${parsed.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup commands, the bot will use the last one you linked.'
			]);
		return message.util!.send({ embed });
	}

	private async enforceSecurity(message: Message, data: Clan) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, SETTINGS.LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			await message.util!.send({ embed: EMBEDS.CLAN_LIMIT(prefix) });
			return Promise.resolve(false);
		}

		const dbUser = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !Util.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code, prefix);
			await message.util!.send({ embed });
			return Promise.resolve(false);
		}

		const id = await this.client.storage.register(message, {
			op: Op.CHANNEL_LINKED,
			guild: message.guild!.id,
			name: data.name,
			tag: data.tag
		});

		await this.client.rpcHandler.add(id, {
			op: Op.CHANNEL_LINKED,
			tag: data.tag,
			guild: message.guild!.id
		});

		return Promise.resolve(true);
	}
}
