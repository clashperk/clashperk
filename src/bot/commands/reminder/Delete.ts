import { Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder, ReminderTemp } from '../../struct/RemindScheduler';
import { Command } from 'discord-akairo';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import ReminderCommand from './Reminder';

const roles: { [key: string]: string } = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

export default class ReminderDeleteCommand extends Command {
	public constructor() {
		super('reminder-delete', {
			category: 'reminder',
			channel: 'guild',
			description: {},
			optionFlags: ['--id'],
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public *args(msg: Message): unknown {
		const id = yield {
			flag: '--id',
			match: msg.interaction ? 'option' : 'phrase',
			type: 'string'
		};

		const clear = yield {
			flag: '--clear',
			match: 'flag'
		};

		return { id, clear };
	}

	public async exec(message: Message, { id, clear }: { id?: string; clear: boolean }) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!reminders.length) return message.util!.send('**You have no reminders.**');

		if (clear) {
			await this.client.db.collection<Reminder>(Collections.REMINDERS).deleteMany({ guild: message.guild!.id });
			await this.client.db.collection<ReminderCommand>(Collections.REMINDERS_TEMP).deleteMany({ guild: message.guild!.id });
			return message.util!.send('**All reminders cleared.**');
		}

		if (id) {
			const reminderId = reminders[Number(id) - 1]?._id as ObjectId | null;
			if (!reminderId) return message.util!.send('**Reminder not found.**');
			await this.client.db.collection<Reminder>(Collections.REMINDERS).deleteOne({ _id: reminderId });
			await this.client.db.collection<ReminderTemp>(Collections.REMINDERS_TEMP).deleteMany({ reminderId });
			return message.util!.send(`**Reminder #${id} deleted.**`);
		}

		if (reminders.length > 25) return message.util!.send('**You have too many reminders, pass id to delete reminders.**');

		const clans = await this.client.storage.findAll(message.guild!.id);
		const customIds = {
			'menu': this.client.uuid(message.author.id),
			'delete': this.client.uuid(message.author.id),
			'view': this.client.uuid(message.author.id)
		};

		const label = (duration: number) => moment.duration(duration)
			.format('H[h], m[m], s[s]', { trim: 'both mid' });

		const state = {
			selected: null as string | null,
			reminders: new Set(reminders.map(rem => rem._id.toHexString()))
		};

		const options = (men = false, view = false, del = false) => {
			const menu = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setCustomId(customIds.menu)
						.setPlaceholder('Select a reminder!')
						.addOptions(
							reminders
								.filter(rem => state.reminders.has(rem._id.toHexString()))
								.map(
									rem => ({
										'label': `${label(rem.duration)} remaining`,
										'value': rem._id.toHexString(),
										'description': `${rem.message.substring(0, 100)}`,
										'default': state.selected === rem._id.toHexString()
									})
								)
						)
						.setDisabled(men)
				);

			const button = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId(customIds.view)
						.setLabel('View')
						.setStyle('PRIMARY')
						.setDisabled(view)
				)
				.addComponents(
					new MessageButton()
						.setCustomId(customIds.delete)
						.setLabel('Delete')
						.setStyle('DANGER')
						.setDisabled(del)
				);

			return [menu, button];
		};

		const embeds = () => {
			const reminder = reminders.find(rem => rem._id.toHexString() === state.selected)!;
			const embed = new MessageEmbed().setColor(this.client.embed(message));
			embed.addField('Duration', `${label(reminder.duration)} remaining`);
			embed.addField('Channel', `<#${reminder.channel}>`);
			if (reminder.roles.length === 4) {
				embed.addField('Roles', 'Any');
			} else {
				embed.addField('Roles', reminder.roles.map(role => roles[role]).join(', '));
			}
			if (reminder.townHalls.length === 13) {
				embed.addField('Town Halls', 'Any');
			} else {
				embed.addField('Town Halls', reminder.townHalls.join(', '));
			}
			if (reminder.remaining.length === 2) {
				embed.addField('Remaining Hits', 'Any');
			} else {
				embed.addField('Remaining Hits', reminder.remaining.join(', '));
			}
			const _clans = clans.filter(clan => reminder.clans.includes(clan.tag)).map(clan => clan.name);
			if (_clans.length) embed.addField('Clans', _clans.join(', ').substring(0, 1024));
			else embed.addField('Clans', reminder.clans.join(', ').substring(0, 1024));
			embed.addField('Message', reminder.message.substring(0, 1024));
			return embed;
		};

		const msg = await message.util!.send({
			embeds: [],
			content: '**Manage War Reminders**',
			components: options(false, true, true)
		});
		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(customIds).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customIds.menu && action.isSelectMenu()) {
				state.selected = action.values[0]!;
				await action.update({ components: options(false, true, false), embeds: [embeds()] });
			}

			if (action.customId === customIds.view) {
				const rems = reminders.filter(rem => state.reminders.has(rem._id.toHexString()));
				await action.update({
					embeds: rems.length ? [embeds()] : [],
					components: rems.length ? options(false, true, false) : [],
					content: rems.length ? '**Manage War Reminders**' : '**You don\'t have any more reminders!**'
				});
			}

			if (action.customId === customIds.delete) {
				await action.deferUpdate();
				state.reminders.delete(state.selected!);

				await this.client.db.collection<Reminder>(Collections.REMINDERS)
					.deleteOne({ _id: new ObjectId(state.selected!) });
				await this.client.db.collection<ReminderTemp>(Collections.REMINDERS_TEMP)
					.deleteMany({ reminderId: new ObjectId(state.selected!) });

				const rems = reminders.filter(rem => state.reminders.has(rem._id.toHexString()));
				await action.editReply({
					embeds: [],
					components: rems.length ? options(false, true, true) : [],
					content: rems.length ? '**Manage War Reminders**' : '**You don\'t have any more reminders!**'
				});
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) {
				this.client.components.delete(id);
			}
			if (!/delete/i.test(reason)) await msg.edit({ components: state.reminders.size ? options(true, true, true) : [] });
		});
	}
}
