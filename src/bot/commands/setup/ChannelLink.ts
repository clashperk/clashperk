import { Collections, EMBEDS, Flags, Settings } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message, TextChannel } from 'discord.js';
import { Clan } from 'clashofclans.js';

export default class ChannelLinkCommand extends Command {
	public constructor() {
		super('setup-channel-link', {
			category: 'none',
			channel: 'guild',
			description: {},
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--tag', '--channel']
		});
	}

	public *args(): unknown {
		const data = yield {
			type: (msg: Message, tag: string) => this.client.resolver.getClan(msg, tag),
			match: 'option',
			flag: '--tag'
		};

		const channel = yield {
			'match': 'option',
			'flag': '--channel',
			'type': 'textChannel',
			'default': (msg: Message) => msg.channel
		};

		return { data, channel };
	}

	public async exec(message: Message, { data, channel }: { data: Clan; channel: TextChannel }) {
		if (!await this.enforceSecurity(message, data)) return;
		const store = await this.client.storage.collection.findOne({ channels: channel.id });
		if (store) {
			return message.util!.send(
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				`**${store.name} (${store.tag})** is already linked to ${channel.toString()}`
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
					channels: channel.id
				},
				$bit: {
					flag: { or: Flags.CHANNEL_LINKED }
				},
				$min: {
					createdAt: new Date()
				}
			}, { upsert: true }
		);

		if (upsertedCount) {
			await this.client.rpcHandler.add(upsertedId.toHexString(), {
				op: Flags.CHANNEL_LINKED,
				guild: message.guild!.id,
				tag: data.tag
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return message.util!.send(`Successfully linked **${data.name} (${data.tag})** to ${channel.toString()}`);
	}

	private async enforceSecurity(message: Message, data: Clan) {
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, Settings.CLAN_LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			await message.util!.send({ embeds: [EMBEDS.CLAN_LIMIT()] });
			return Promise.resolve(false);
		}

		const dbUser = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !this.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code);
			await message.util!.send({ embeds: [embed] });
			return Promise.resolve(false);
		}

		const id = await this.client.storage.register(message, {
			op: Flags.CHANNEL_LINKED,
			guild: message.guild!.id,
			name: data.name,
			tag: data.tag
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CHANNEL_LINKED,
			tag: data.tag,
			guild: message.guild!.id
		});

		return Promise.resolve(true);
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter(en => en.verified).map(en => en.tag);
		return clan.memberList.filter(m => ['coLeader', 'leader'].includes(m.role))
			.some(m => verifiedTags.includes(m.tag)) || clan.description.toUpperCase().includes(code);
	}
}
