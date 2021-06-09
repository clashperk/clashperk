import { COLLECTIONS } from '../../util/Constants';
import { Message, Role } from 'discord.js';
import { Command } from 'discord-akairo';

export default class AutoRoleCommand extends Command {
	public constructor() {
		super('setup-auto-role', {
			category: 'beta',
			aliases: ['autorole'],
			channel: 'guild',
			description: {
				content: [
					'Auto assign roles to members based upon their role in the clan.',
					'',
					'- This command works with slash command only.',
					'- Players must be linked to our system to receive roles.',
					'- You can either use same roles for all clans or individual roles for each clan, but not both.'
				]
			},
			userPermissions: ['MANAGE_GUILD'],
			flags: ['--verify'],
			optionFlags: ['--tag', '--members', '--elders', '--co-leads'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY', 'MANAGE_ROLES']
		});
	}

	public *args(): unknown {
		const member = yield {
			flag: '--members',
			type: 'role',
			match: 'option'
		};

		const admin = yield {
			flag: '--elders',
			type: 'role',
			match: 'option'
		};

		const coLeader = yield {
			flag: '--co-leads',
			type: 'role',
			match: 'option'
		};

		const tag = yield {
			flag: '--tag',
			match: 'option'
		};

		const secureRole = yield {
			flag: '--verify',
			match: 'flag'
		};

		return { tag, member, admin, coLeader, secureRole };
	}

	public async exec(message: Message, { tag, member, admin, coLeader, secureRole }: { tag?: string; member?: Role; admin?: Role; coLeader?: Role; secureRole: boolean }) {
		if (!(member && admin && coLeader)) {
			return message.util!.send('You must provide 3 valid roles!');
		}

		if ([member, admin, coLeader].filter(role => role.managed).length) {
			return message.util!.send('Bot roles can\'t be used.');
		}

		if ([member, admin, coLeader].filter(role => role.position > message.guild!.me!.roles.highest.position).length) {
			return message.util!.send('My role must be higher than these roles.');
		}

		if (tag) {
			const clan = await this.client.http.clan(tag);
			if (!clan.ok) return message.util!.send('Invalid clan tag!');

			await this.client.db.collection(COLLECTIONS.CLAN_STORES)
				.updateMany(
					{ guild: message.guild!.id, autoRole: 2 },
					{ $unset: { role_ids: '', roles: '', autoRole: '' } }
				);

			const ex = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
				.findOne({ tag: { $ne: clan.tag }, role_ids: { $in: [member.id, admin.id, coLeader.id] } });

			if (ex) return message.util!.send('This roles have already been used for another clan.');

			const up = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
				.updateOne({ tag: clan.tag, guild: message.guild!.id }, {
					$set: {
						roles: { member: member.id, admin: admin.id, coLeader: coLeader.id },
						autoRole: 1, secureRole
					},
					$addToSet: { role_ids: { $each: [member.id, admin.id, coLeader.id] } }
				});

			if (!up.matchedCount) return message.util!.send('Clan not found in the server!');

			return message.util!.send('**Successfully enabled automatic role management!**');
		}

		const clans = await this.client.storage.findAll(message.guild!.id);
		if (!clans.length) return message.util!.send('No clans in this server');

		await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.updateMany(
				{ guild: message.guild!.id, autoRole: 1 },
				{ $unset: { role_ids: '', roles: '', autoRole: '' } }
			);

		await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.updateMany(
				{ guild: message.guild!.id },
				{
					$set: {
						roles: { member: member.id, admin: admin.id, coLeader: coLeader.id },
						autoRole: 2, secureRole
					},
					$addToSet: { role_ids: { $each: [member.id, admin.id, coLeader.id] } }
				}
			);

		return message.util!.send('**Successfully enabled automatic role management!**');
	}
}
