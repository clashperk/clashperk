import { HexColorString, resolveColor } from 'discord.js';

export const CommandHandlerEvents = {
  COMMAND_ENDED: 'commandEnded',
  COMMAND_STARTED: 'commandStarted',
  ERROR: 'error',
  COMMAND_INVALID: 'commandInvalid',
  COMMAND_DISABLED: 'commandDisabled',
  COMMAND_BLOCKED: 'commandBlocked',
  MISSING_PERMISSIONS: 'missingPermissions'
} as const;

export const WSEventTypes = {
  GUILD_MEMBER_UPDATE: 'GUILD_MEMBER_UPDATE'
} as const;

export interface WSEvents {
  [WSEventTypes.GUILD_MEMBER_UPDATE]: [];
}

export interface CommandEvents {
  [CommandHandlerEvents.ERROR]: [];
  [CommandHandlerEvents.COMMAND_INVALID]: [];
  [CommandHandlerEvents.COMMAND_DISABLED]: [];
  [CommandHandlerEvents.COMMAND_BLOCKED]: [];
  [CommandHandlerEvents.MISSING_PERMISSIONS]: [];
  [CommandHandlerEvents.COMMAND_ENDED]: [];
  [CommandHandlerEvents.COMMAND_STARTED]: [];
}

export const BuiltInReasons = {
  DM: 'dm',
  USER: 'user',
  WHITELIST: 'whitelist',
  GUILD: 'guild',
  CHANNEL: 'channel',
  CLIENT: 'client',
  OWNER: 'owner'
} as const;

export const ResolveColor = (hex: string) => {
  try {
    return resolveColor(hex as HexColorString);
  } catch {
    return null;
  }
};
