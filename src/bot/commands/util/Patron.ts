import { Collections, Settings } from '@clashperk/node';
import { Message, TextChannel } from 'discord.js';
import { Command } from 'discord-akairo';

interface Patron {
	id: string;
	name: string;
	guilds: {
		id: string;
		limit: number;
	}[];
	active: boolean;
	discord_id?: string;
	discord_username?: string;
}

export default class PatronCommand extends Command {
	public constructor() {
		super('patron', {
			aliases: ['patron', 'donate', 'patreon'],
			category: '_hidden',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Get information about the bot\'s patreon.'
			},
			args: [
				{
					id: 'action',
					type: ['add', 'del']
				},
				{
					id: 'id',
					type: 'string'
				}
			]
		});
	}

	public async exec(message: Message, { action, id }: { action: string; id: string }) {
		if (action && id && this.client.isOwner(message.author.id)) {
			const patrons = await this.patrons();
			const patron = patrons.find((d: any) => d?.discord_id === id);
			for (const guild of patron?.guilds ?? []) {
				if (action === 'add') await this.add(guild.id);
				if (action === 'del') await this.del(guild.id);
			}

			if (action === 'add' && patron) {
				await this.client.db.collection(Collections.PATRONS)
					.updateOne(
						{ id: patron.id },
						{ $set: { active: true } }
					);

				await this.client.patrons.refresh();
				return message.util!.send('Success!');
			}

			if (action === 'del' && patron) {
				await this.client.db.collection(Collections.PATRONS)
					.updateOne(
						{ id: patron.id },
						{ $set: { active: false } }
					);

				await this.client.patrons.refresh();
				return message.util!.send('Success!');
			}

			return message.util!.send('Failed!');
		}

		const embed = this.client.util.embed()
			.setColor(16345172)
			.setAuthor(this.client.user!.username, this.client.user!.displayAvatarURL(), 'https://www.patreon.com/clashperk')
			.setDescription([
				'Help us with our hosting related expenses.',
				'Any help is beyond appreciated. Thanks!',
				'',
				'**Benefits**',
				'🔸 Only one sec cooldown and faster updates.',
				//
				'🔸 Special commands, custom Embed colors.',
				//
				'🔸 Self updating Clan Promotional Embed.',
				//
				'🔸 Claim unlimited number of clans.',
				'',
				'🔸 Export to Excel File',
				'\u200e \u2002 🔹 Current/historic war attacks.',
				'\u200e \u2002 🔹 Clan Members with many stats.',
				'\u200e \u2002 🔹 Current CWL attacks and summary.',
				'\u200e \u2002 🔹 Season stats with Discord username.',
				'',
				'🔸 Patron Role on our Support Discord.',
				'',
				'**[Support us on Patreon](https://www.patreon.com/clashperk) | [Support Discord](https://discord.gg/ppuppun)**'
			].join('\n'));

		if (!(message.channel as TextChannel).permissionsFor(message.guild!.me!)!.has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'], false)) {
			return message.util!.send({ embeds: [embed] });
		}

		const msg = await message.util!.send({ embeds: [embed] });
		await msg.react('➕');
		const collector = msg.createReactionCollector(
			(reaction, user) => ['➕'].includes(reaction.emoji.name!) && user.id === message.author.id,
			{ time: 60000, max: 1 }
		);

		const patrons = (await this.patrons()).filter(patron => patron.active && patron.discord_id !== this.client.ownerID);
		collector.on('collect', async reaction => {
			if (reaction.emoji.name === '➕') {
				collector.stop();

				embed.setDescription([
					embed.description,
					'',
					`**Our Current Patrons (${patrons.length})**`,
					patrons.map(patron => `• ${patron.discord_username ?? patron.name}`)
						.join('\n')
				].join('\n'));
				return msg.edit({ embeds: [embed] });
			}
		});

		collector.on('end', () => msg.reactions.removeAll().catch(() => null));
	}

	private patrons() {
		return this.client.db
			.collection<Patron>(Collections.PATRONS)
			.find()
			.sort({ createdAt: 1 })
			.toArray();
	}

	private async add(guild: string) {
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild }, { $set: { active: true, patron: true } });

		await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild })
			.forEach(data => this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 }));
	}

	private async del(guild: string) {
		this.client.settings.delete(guild, Settings.CLAN_LIMIT); // Delete ClanLimit

		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild }, { $set: { patron: false } });

		await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild })
			.skip(2)
			.forEach(async data => {
				await this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: data._id }, { $set: { active: false } });
				await this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild });
			});
	}
}
