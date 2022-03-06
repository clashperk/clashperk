import { Collections, EMBEDS, Flags, Settings } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { Clan } from 'clashofclans.js';

export default class ServerLinkCommand extends Command {
	public constructor() {
		super('setup-server-link', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {},
			optionFlags: ['--tag']
		});
	}

	public *args(): unknown {
		const data = yield {
			flag: '--tag',
			match: 'option',
			type: (msg: Message, tag: string) => this.client.resolver.getClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const clan = await this.client.storage.collection.findOne({ tag: data.tag, guild: message.guild!.id });
		if (clan) return message.util!.send(`**${clan.name} (${clan.tag})** is already linked to ${message.guild!.name}`);

		if (!await this.enforceSecurity(message, data)) return;
		return message.util!.send(`Successfully linked **${data.name} (${data.tag})** to **${message.guild!.name}**`);
	}

	private async enforceSecurity(message: Message, data: Clan) {
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, Settings.CLAN_LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag) && !this.client.isOwner(message.author.id)) {
			await message.util!.send({ embeds: [EMBEDS.CLAN_LIMIT()] });
			return false;
		}

		const user = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !this.verifyClan(code, data, user?.entries ?? []) && !this.client.isOwner(message.author.id)) {
			const embed = EMBEDS.VERIFY_CLAN(data, code);
			await message.util!.send({ embeds: [embed] });
			return false;
		}

		const id = await this.client.storage.register(message, {
			op: Flags.SERVER_LINKED,
			guild: message.guild!.id,
			name: data.name,
			tag: data.tag
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CHANNEL_LINKED,
			tag: data.tag,
			guild: message.guild!.id
		});

		return true;
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter(en => en.verified).map(en => en.tag);
		return clan.memberList.filter(m => ['coLeader', 'leader'].includes(m.role))
			.some(m => verifiedTags.includes(m.tag)) || clan.description.toUpperCase().includes(code);
	}
}
