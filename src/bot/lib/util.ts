export const CommandHandlerEvents = {
	COMMAND_ENDED: 'commandEnded',
	COMMAND_EXECUTED: 'commandExecuted',
	ERROR: 'error',
	COMMAND_INVALID: 'commandInvalid',
	COMMAND_DISABLED: 'commandDisabled',
	COMMAND_BLOCKED: 'commandBlocked',
	MISSING_PERMISSIONS: 'missingPermissions'
} as const;

export interface CommandEvents {
	[CommandHandlerEvents.ERROR]: [];
	[CommandHandlerEvents.COMMAND_INVALID]: [];
	[CommandHandlerEvents.COMMAND_DISABLED]: [];
	[CommandHandlerEvents.COMMAND_BLOCKED]: [];
	[CommandHandlerEvents.MISSING_PERMISSIONS]: [];
	[CommandHandlerEvents.COMMAND_ENDED]: [];
	[CommandHandlerEvents.COMMAND_EXECUTED]: [];
}

export const BuiltInReasons = {
	DM: 'dm',
	USER: 'user',
	GUILD: 'guild',
	CHANNEL: 'channel',
	CLIENT: 'client',
	OWNER: 'owner'
} as const;
