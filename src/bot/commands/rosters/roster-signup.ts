import { APIPlayer } from 'clashofclans.js';
import { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from 'discord.js';
import { ObjectId } from 'mongodb';
import { cluster } from 'radash';
import { Command } from '../../lib/index.js';
import { RosterLog } from '../../struct/RosterManager.js';
import { TOWN_HALLS } from '../../util/_emojis.js';
import { createInteractionCollector } from '../../util/_Pagination.js';
import { sumHeroes } from '../../util/Helper.js';

export default class RosterSignupCommand extends Command {
  public constructor() {
    super('roster-signup', {
      category: 'roster',
      channel: 'guild',
      defer: true,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { roster: string; signup: boolean }) {
    if (!ObjectId.isValid(args.roster)) return interaction.followUp({ content: 'Invalid roster ID.', ephemeral: true });

    const rosterId = new ObjectId(args.roster);
    const roster = await this.client.rosterManager.get(rosterId);
    if (!roster) return interaction.followUp({ content: 'Roster was deleted.', ephemeral: true });

    const isClosed = this.client.rosterManager.isClosed(roster);
    if (isClosed) {
      const row = this.client.rosterManager.getRosterComponents({ roster, signupDisabled: false });
      await interaction.editReply({ components: [row] });
      return interaction.followUp({ content: 'Roster is closed.', ephemeral: true });
    }

    const players = await this.client.resolver.getPlayers(interaction.user.id, 75);
    players.sort((a, b) => b.townHallLevel ** (b.townHallWeaponLevel ?? 1) - a.townHallLevel ** (a.townHallWeaponLevel ?? 1));
    players.sort((a, b) => sumHeroes(b) - sumHeroes(a));
    players.sort((a, b) => b.townHallLevel - a.townHallLevel);

    const playerCustomIds: Record<string, string> = {
      0: this.client.uuid(interaction.user.id),
      1: this.client.uuid(interaction.user.id),
      2: this.client.uuid(interaction.user.id)
    };
    const customIds = {
      select: this.client.uuid(interaction.user.id),
      category: this.client.uuid(interaction.user.id),
      ...playerCustomIds
    };

    const filterPlayers = (player: APIPlayer) => {
      if (players.length < 25) return true;

      const hasSignedUp = signedUp.includes(player.tag);
      if (roster.minTownHall) {
        return !hasSignedUp && player.townHallLevel >= roster.minTownHall;
      }
      return !hasSignedUp;
    };

    const signedUp = roster.members.map((member) => member.tag);
    const linked = players
      .filter((player) => filterPlayers(player))
      .map((player) => {
        const heroes = player.heroes.filter((hero) => hero.village === 'home');
        return {
          label: `${signedUp.includes(player.tag) ? '[SIGNED UP] ' : ''}${player.name} (${player.tag})`,
          value: player.tag,
          emoji: TOWN_HALLS[player.townHallLevel],
          description: heroes.length ? `${heroes.map((hero) => `${this.initials(hero.name)} ${hero.level}`).join(', ')}` : undefined
        };
      });
    const registered = roster.members
      .filter((mem) => mem.userId === interaction.user.id)
      .map((mem) => ({
        label: `${mem.name} (${mem.tag})`,
        value: mem.tag,
        emoji: TOWN_HALLS[mem.townHallLevel]
      }));
    const _options = args.signup ? linked : registered;

    if (!linked.length && args.signup) {
      return interaction.followUp({ content: 'You are not linked to any players.', ephemeral: true });
    }

    if (!registered.length && !args.signup) {
      return interaction.followUp({ content: 'You are not signed up for this roster.', ephemeral: true });
    }

    const categories = await this.client.rosterManager.getCategories(interaction.guild.id);
    const selectableCategories = categories.filter((category) => category.selectable).sort((a, b) => a.order - b.order);

    const selected: { category: null | string } = {
      category: null
    };

    const categoryMenu = new StringSelectMenuBuilder()
      .setMinValues(1)
      .setPlaceholder('Choose a group (confirmed, substitute, etc)')
      .setCustomId(customIds.category)
      .setOptions(
        selectableCategories.map((category) => ({
          label: category.displayName,
          value: category._id.toHexString(),
          default: selected.category === category._id.toHexString()
        }))
      );
    const categoryRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categoryMenu);

    const accountsRows = cluster(_options.slice(0, 75), 25).map((options, idx) => {
      const accountsMenu = new StringSelectMenuBuilder()
        .setMinValues(1)
        .setMaxValues(options.length)
        .setCustomId(playerCustomIds[idx])
        .setOptions(options);

      if (_options.length > 25) {
        accountsMenu.setPlaceholder(`Select accounts! [${25 * idx + 1} - ${25 * (idx + 1)}]`);
      } else {
        accountsMenu.setPlaceholder('Select accounts!');
      }
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(accountsMenu);
    });

    const msg = await interaction.followUp({
      content: args.signup ? 'Select the accounts you want to signup with.' : 'Select the accounts you want to remove.',
      ephemeral: true,
      components:
        args.signup && roster.allowCategorySelection && selectableCategories.length ? [categoryRow, ...accountsRows] : [...accountsRows]
    });

    const categoryId = roster.allowCategorySelection ? selectableCategories.at(0)?._id.toHexString() : null;

    const signupUser = async (action: StringSelectMenuInteraction<'cached'>) => {
      await action.deferUpdate();

      const result = [];
      const changeLog = [];
      for (const tag of action.values) {
        const player = players.find((mem) => mem.tag === tag)!;
        const updated = await this.client.rosterManager.selfSignup({
          player,
          rosterId,
          user: interaction.user,
          categoryId: selected.category || categoryId
        });
        result.push({
          success: updated.success,
          message: `**\u200e${player.name} (${player.tag})** ${updated.success ? '- ' : '\n'}${updated.message}`
        });

        if (updated.success && updated.roster) {
          const member = updated.roster.members.find((mem) => mem.tag === player.tag);
          if (member) changeLog.push(member);
        }
      }
      const errored = result.some((res) => !res.success);

      const roster = await this.client.rosterManager.get(rosterId);
      if (!roster) return action.editReply({ content: 'Roster was deleted.', embeds: [], components: [] });

      if (errored) {
        await action.editReply({
          content: ['**Failed to signup a few accounts!**', ...result.map((res) => res.message)].join('\n\n'),
          embeds: [],
          components: []
        });
      } else {
        await action.editReply({ content: 'You have been added to the roster.', embeds: [], components: [] });
      }

      if (changeLog.length) {
        this.client.rosterManager.rosterChangeLog({
          roster,
          user: interaction.user,
          action: RosterLog.SIGNUP,
          members: changeLog,
          categoryId: selected.category || categoryId
        });
      }

      const embed = this.client.rosterManager.getRosterEmbed(roster, categories);
      return interaction.editReply({ embeds: [embed] });
    };

    const optOutUser = async (action: StringSelectMenuInteraction<'cached'>) => {
      await action.deferUpdate();

      const members = roster.members.filter((mem) => action.values.includes(mem.tag));

      const updated = await this.client.rosterManager.optOut(roster, ...action.values);
      if (!updated) return action.editReply({ content: 'You are not signed up for this roster.', embeds: [], components: [] });

      await action.editReply({ content: 'You have been removed from the roster.', embeds: [], components: [] });

      if (members.length) {
        this.client.rosterManager.rosterChangeLog({
          action: RosterLog.OPT_OUT,
          members,
          roster,
          user: interaction.user
        });
      }

      const embed = this.client.rosterManager.getRosterEmbed(updated, categories);
      return interaction.editReply({ embeds: [embed] });
    };

    const selectCategory = async (action: StringSelectMenuInteraction<'cached'>) => {
      selected.category = action.values[0];
      categoryMenu.setOptions(
        selectableCategories.map((category) => ({
          label: category.displayName,
          value: category._id.toHexString(),
          default: selected.category === category._id.toHexString()
        }))
      );
      await action.update({ content: msg.content, components: [categoryRow, ...accountsRows] });
    };

    createInteractionCollector({
      interaction,
      customIds,
      message: msg,
      onSelect: (action) => {
        if (action.customId === customIds.category) {
          return selectCategory(action);
        }

        if (args.signup) return signupUser(action);
        return optOutUser(action);
      }
    });
  }

  private initials(str: string) {
    return str
      .split(/\s+/)
      .map((word) => word.at(0))
      .join('');
  }
}
