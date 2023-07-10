export const MembersCommandOptions = {
	discord: {
		id: 'link-list',
		label: 'Discord Links',
		description: 'Discord links of the clan members.'
	},
	heroes: {
		id: 'heroes',
		label: 'War Weight',
		description: 'Heroes and town hall levels of the clan members.'
	},
	warPref: {
		id: 'war-pref',
		label: 'War Preferences',
		description: 'War preferences of the clan members.'
	},
	tags: {
		id: 'tags',
		label: 'Player Tags',
		description: 'Player tags of the clan members.'
	},
	roles: {
		id: 'roles',
		label: 'Clan Roles',
		description: 'Roles of the clan members.'
	},
	trophies: {
		id: 'trophies',
		label: 'Trophies',
		description: 'Trophies of the clan members.'
	},
	joinDate: {
		id: 'join-date',
		label: 'Join Date',
		description: 'Last joining dates of the clan members.'
	},
	progress: {
		id: 'progress',
		label: 'Player Progress',
		description: 'Player progress of the clan members.'
	},
	attacks: {
		id: 'attacks',
		label: 'Attacks & Defenses',
		description: 'Attacks and defenses of the clan members.'
	}
} as const;

export const RosterCommandSortOptions = [
	{
		name: 'Player Name',
		value: 'PLAYER_NAME'
	},
	{
		name: 'Discord Username',
		value: 'DISCORD_NAME'
	},
	{
		name: 'Town Hall Level',
		value: 'TOWN_HALL_LEVEL'
	},
	{
		name: 'Hero Levels',
		value: 'HERO_LEVEL'
	},
	{
		name: 'TH + Hero Levels',
		value: 'TH_HERO_LEVEL'
	},
	{
		name: 'Clan Name',
		value: 'CLAN_NAME'
	},
	{
		name: 'Signup Time',
		value: 'SIGNUP_TIME'
	}
] as const;

export const RosterManageActions = {
	ADD_USER: 'add-user',
	DEL_USER: 'del-user',
	CHANGE_ROSTER: 'change-roster',
	CHANGE_CATEGORY: 'change-category'
} as const;
