import { Collections } from '../../util/Constants';
import { Message, Role, Snowflake } from 'discord.js';
import { Command } from 'discord-akairo';

export interface Args {
	tag?: string;
	member?: Role;
	admin?: Role;
	coLeader?: Role;
	secureRole: boolean;
}

export default class AutoRoleCommand extends Command {
	public constructor() {
		super('setup-auto-role', {
			category: 'setup',
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
			clientPermissions: ['EMBED_LINKS', 'MANAGE_ROLES']
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

	public async exec(message: Message, { tag, member, admin, coLeader, secureRole }: Args) {
		if (!message.interaction) {
			return message.util!.send(
				{
					content: 'This command only works with slash command.',
					files: ['https://cdn.discordapp.com/attachments/583980382089773069/853316608307232787/unknown.png']
				}
			);
		}

		if (!(member && admin && coLeader)) {
			return message.util!.send('You must provide 3 valid roles!');
		}

		if ([member, admin, coLeader].filter(role => role.managed || role.id === message.guild!.id).length) {
			return message.util!.send('Bot roles can\'t be used.');
		}

		if ([member, admin, coLeader].filter(role => role.position > message.guild!.me!.roles.highest.position).length) {
			return message.util!.send('My role must be higher than these roles.');
		}

		if (tag) {
			const clan = await this.client.http.clan(tag);
			if (!clan.ok) return message.util!.send('Invalid clan tag!');

			await this.client.db.collection(Collections.CLAN_STORES)
				.updateMany(
					{ guild: message.guild!.id, autoRole: 2 },
					{ $unset: { role_ids: '', roles: '', autoRole: '' } }
				);

			const ex = await this.client.db.collection(Collections.CLAN_STORES)
				.findOne({ tag: { $ne: clan.tag }, role_ids: { $in: [member.id, admin.id, coLeader.id] } });

			if (ex) return message.util!.send('This roles have already been used for another clan.');

			const up = await this.client.db.collection(Collections.CLAN_STORES)
				.updateOne({ tag: clan.tag, guild: message.guild!.id }, {
					$set: {
						roles: { member: member.id, admin: admin.id, coLeader: coLeader.id },
						autoRole: 1, secureRole
					},
					$addToSet: { role_ids: { $each: [member.id, admin.id, coLeader.id] } }
				});

			if (!up.matchedCount) return message.util!.send('Clan not found in this server!');

			this.updateLinksAndRoles([clan]);
			return message.util!.send('**Successfully enabled automatic role management!**');
		}

		const clans = await this.client.storage.findAll(message.guild!.id);
		if (!clans.length) return message.util!.send('No clans in this server');

		await this.client.db.collection(Collections.CLAN_STORES)
			.updateMany(
				{ guild: message.guild!.id, autoRole: 1 },
				{ $unset: { role_ids: '', roles: '', autoRole: '' } }
			);

		await this.client.db.collection<{ role_ids: Snowflake[] }>(Collections.CLAN_STORES)
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


		this.updateLinksAndRoles(clans);
		return message.util!.send('**Successfully enabled automatic role management!**');
	}

	private async updateLinksAndRoles(clans: { tag: string }[]) {
		for (const clan of clans) {
			const data = await this.client.http.clan(clan.tag);
			if (!data.ok) continue;

			const members = await this.client.db.collection(Collections.LINKED_PLAYERS)
				.aggregate<{ user: string; tag: string }>([
				{
					$match: {
						'entries.tag': data.memberList.map(mem => mem.tag)
					}
				}, {
					$unwind: {
						path: '$entries'
					}
				}, {
					$project: {
						tag: '$entries.tag', user: '$user'
					}
				}
			]).toArray();

			const unknowns = await this.client.http.getDiscordLinks(data.memberList);
			for (const { user, tag } of unknowns) {
				if (members.find(mem => mem.tag === tag && mem.user === user)) continue;

				const member = data.memberList.find(mem => mem.tag === tag) ?? await this.client.http.player(tag);
				if (!member.name) continue;
				try {
					await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
						{ user, 'entries.tag': { $ne: tag } },
						{
							$push: {
								entries: { tag, name: member.name, verified: false, unknown: true }
							},
							$setOnInsert: {
								clan: {
									tag: data.tag,
									name: data.name
								},
								createdAt: new Date()
							},
							$set: {
								user_tag: this.client.users.cache.get(user as Snowflake)?.tag
							}
						},
						{ upsert: true }
					);
				} catch {}
			}

			await this.client.rpcHandler.roleManager.queue(data);
		}
	}
}
