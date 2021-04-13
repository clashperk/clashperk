interface Emojis {
	[key: string]: string;
}

export const HOME_HEROES: Emojis = {
	'Barbarian King': '<:Barbarian_King:696305370682884111>',
	'Archer Queen': '<:Archer_Queen:696305403046133780>',
	'Grand Warden': '<:Grand_Warden:696305417994764298>',
	'Royal Champion': '<:Royal_Champion:813806447934308422>'
};

export const ELIXIR_TROOPS: Emojis = {
	'Barbarian': '<:barbarian:696280898122809344>',
	'Archer': '<:archer:696280941005504592>',
	'Giant': '<:giant:696280991697731585>',
	'Goblin': '<:goblin:696281044764327966>',
	'Wall Breaker': '<:wallbreaker:696281102637334539>',
	'Balloon': '<:balloon:696281155250683915>',
	'Wizard': '<:wizard:696281232971137084>',
	'Healer': '<:healer:696281319394639982>',
	'Dragon': '<:dragon:696281449820848158>',
	'P.E.K.K.A': '<:pekka:696281471127912468>',
	'Baby Dragon': '<:babydragon:696281500018278400>',
	'Miner': '<:miner:696281535111757895>',
	'Electro Dragon': '<:electrodragon:696281556930527352>',
	'Yeti': '<:yeti:696281814293282857>'
};

export const HEROE_PETS: Emojis = {
	'Electro Owl': '<:Owl:831123515939356703>',
	'L.A.S.S.I': '<:LASSI:831123509827731527>',
	'Mighty Yak': '<:Yak:831123515067334707>',
	'Unicorn': '<:Unicorn:831123514613694564>'
};

export const DARK_ELIXIR_TROOPS: Emojis = {
	'Minion': '<:minion:696281875794231326>',
	'Hog Rider': '<:hogrider:696281961257238579>',
	'Valkyrie': '<:valkyrie:696282003158597662>',
	'Golem': '<:golem:696282074788659250>',
	'Witch': '<:witch:696282143508267068>',
	'Lava Hound': '<:lavahound:696282183832305685>',
	'Bowler': '<:bowler:696282213360074782>',
	'Ice Golem': '<:icegolem:696282324798799892>',
	'Headhunter': '<:headhunter:724650414066106459>'
};

export const SEIGE_MACHINES: Emojis = {
	'Wall Wrecker': '<:wallwrecker:696282434278522931>',
	'Battle Blimp': '<:battleblimp:696282472480112731>',
	'Stone Slammer': '<:stoneslammer:696282610472714271>',
	'Siege Barracks': '<:siegebarracks:696282751988400199>',
	'Log Launcher': '<:LogLauncher:785737986108162048>'
};

export const ELIXIR_SPELLS: Emojis = {
	'Lightning Spell': '<:lightning:785740412010364958>',
	'Healing Spell': '<:healing:696302035913670737>',
	'Rage Spell': '<:rage:696302044343959572>',
	'Jump Spell': '<:jump:696302055681425438>',
	'Freeze Spell': '<:freeze:696302064992780299>',
	'Clone Spell': '<:clone:696302107950710795>',
	'Invisibility Spell': '<:invspell:787186410032463882>'
};

export const DARK_SPELLS: Emojis = {
	'Poison Spell': '<:poison:696302119434846231>',
	'Earthquake Spell': '<:earthquake:696302170957414460>',
	'Haste Spell': '<:haste:696302178763276348>',
	'Skeleton Spell': '<:skeleton:696302204348530698>',
	'Bat Spell': '<:batspell:696303291176583198>'
};

export const SUPER_TROOPS: Emojis = {
	'Super Barbarian': '<:subbarb:789730407360495646>',
	'Sneaky Goblin': '<:supgoblin:789730408102232064>',
	'Super Giant': '<:supgiant:789730409051193364>',
	'Super Wall Breaker': '<:supwb:789730406206275595>',
	'Super Archer': '<:suparch:789730408673181717>',
	'Super Witch': '<:supwitch:789730409210576897>',
	'Inferno Dragon': '<:supbaby:789730408878309376>',
	'Super Valkyrie': '<:supervalk:789730405967462440>',
	'Super Minion': '<:supminion:789730407930920990>',
	'Super Wizard': '<:superwiz:789730402189049876>',
	'Ice Hound': '<:IceHound:789730401816018945>'
};

export const BUILDER_ELIXIR_TROOPS: Emojis = {
	'Raged Barbarian': '<:ragedbarbarian:696283193426575390>',
	'Sneaky Archer': '<:sneakyarcher:696283216687923223>',
	'Boxer Giant': '<:boxergiant:696283264968556555>',
	'Beta Minion': '<:betaminion:696283283910295552>',
	'Bomber': '<:bomber:696283305493921842>',
	'Baby Dragon': '<:babydragon:696281500018278400>',
	'Cannon Cart': '<:cannoncart:696283381654093854>',
	'Night Witch': '<:nightwitch:696283537145462814>',
	'Drop Ship': '<:dropship:696283560373387305>',
	'Super P.E.K.K.A': '<:superpekka:696283614891081769>',
	'Hog Glider': '<:hogglider:696289358780563489>'
};

export const BUILDER_HEROES: Emojis = {
	'Battle Machine': '<:War_Machine:696305434570522665>'
};

export const HEROES: Emojis = {
	...HOME_HEROES,
	...BUILDER_HEROES
};

export const HOME_TROOPS: Emojis = {
	...HOME_HEROES,
	...ELIXIR_TROOPS,
	...DARK_ELIXIR_TROOPS,
	...SEIGE_MACHINES,
	...ELIXIR_SPELLS,
	...DARK_SPELLS,
	...HEROE_PETS
};

export const BUILDER_TROOPS: Emojis = {
	...BUILDER_ELIXIR_TROOPS,
	...BUILDER_HEROES
};

export const TOWN_HALLS: Emojis = {
	1: '<:townhall1:696304616173993994>',
	2: '<:townhall2:696304646771179540>',
	3: '<:townhall3:696304661061173289>',
	4: '<:townhall4:696304680468348968>',
	5: '<:townhall5:696304696360435742>',
	6: '<:townhall6:696304709144674315>',
	7: '<:townhall7:696304727465394176>',
	8: '<:townhall8:696304744414576640>',
	9: '<:townhall9:696304757496610856>',
	10: '<:townhall10:696304773225250858>',
	11: '<:townhall11:696304807723663400>',
	12: '<:townhall12:766206520492818482>',
	13: '<:townhall13:766207117103071242>',
	14: '<:townhall14:829392900110549038>'
};

export const BUILDER_HALLS: Emojis = {
	1: '<:builderhall1:696304006590365705>',
	2: '<:builderhall2:696304029872947211>',
	3: '<:builderhall3:696304259297181756>',
	4: '<:builderhall4:696304286233002035>',
	5: '<:builderhall5:696304314897006662>',
	6: '<:builderhall6:696304332068618320>',
	7: '<:builderhall7:696304359209959494>',
	8: '<:builderhall8:696304386183397396>',
	9: '<:builderhall9:766206733541572618>'
};

export const PLAYER_LEAGUES: Emojis = {
	29000000: '<:no_league:696307595924996107>',
	29000001: '<:bronzeone:696300871188742154>',
	29000002: '<:bronzetwo:696300909218627614>',
	29000003: '<:bronzeone:696300871188742154>',
	29000004: '<:silverthree:696301558643687435>',
	29000005: '<:silvertwo:696301546345988117>',
	29000006: '<:silverone:696301503102713866>',
	29000007: '<:goldthree:696301177310150666>',
	29000008: '<:goldtwo:696301155273146429>',
	29000009: '<:goldone:696301052970008616>',
	29000010: '<:crystalthree:696301325696368700>',
	29000011: '<:crystaltwo:696301312949747834>',
	29000012: '<:crystalone:696301295535128646>',
	29000013: '<:masterthree:696301488481239070>',
	29000014: '<:mastertwo:696301457183604796>',
	29000015: '<:masterone:696301370923417660>',
	29000016: '<:champthree:696301636460478514>',
	29000017: '<:champtwo:696301614813675520>',
	29000018: '<:champone:696301596451012688>',
	29000019: '<:titanthree:696301740143804456>',
	29000020: '<:titantwo:696301700964810792>',
	29000021: '<:titanone:696301653258797056>',
	29000022: '<:legend:696301773513818162>',
	29000023: '<:legend:696301773513818162>',
	29000024: '<:legend:696301773513818162>',
	29000025: '<:legend:696301773513818162>'
};

export const ACHIEVEMENT_STARS: Emojis = {
	0: '<:zerostar:696294293782003722>',
	1: '<:onestar:696294317932675122>',
	2: '<:twostar:696294341186158593>',
	3: '<:threestar:696294365663985674>'
};

export const CWL_LEAGUES: Emojis = {
	'Champion League I': '<:champion_1:717735571933364334>',
	'Champion League II': '<:champion_2:717735583962759228>',
	'Champion League III': '<:champion_3:717735599184019598>',
	'Crystal League I': '<:crystal_1:717735618146467863>',
	'Crystal League II': '<:crystal_2:717735624815149107>',
	'Crystal League III': '<:crystal_3:717735631815704606>',
	'Master League I': '<:master_1:717735642708049967>',
	'Master League II': '<:master_2:717735651491053671>',
	'Master League III': '<:master_3:717735658113990738>',
	'Gold League I': '<:gold_1:717735671623843852>',
	'Gold League II': '<:gold_2:717735681589379185>',
	'Gold League III': '<:gold_3:717735697687248897>',
	'Silver League I': '<:silver_1:717735708839903304>',
	'Silver League II': '<:silver_2:717735717031378984>',
	'Silver League III': '<:silver_3:717735724937379870>',
	'Bronze League I': '<:bronze_1:717735738363609168>',
	'Bronze League II': '<:bronze_2:717735744856391702>',
	'Bronze League III': '<:bronze_3:717735755815976981>'
};

export const CLAN_LABELS: Emojis = {
	'Clan Wars': '<:clan_wars:731494209449885738>',
	'Clan War League': '<:clan_war_league:731494200205639750>',
	'Trophy Pushing': '<:trophy_pushing:731494210703720571>',
	'Friendly Wars': '<:friendly_wars:731494223416655892>',
	'Clan Games': '<:clan_games:731494204668379216>',
	'Builder Base': '<:builder_base:731494215309197352>',
	'Base Designing': '<:base_designing:731494224763289620>',
	'International': '<:international:731494220724043807>',
	'Farming': '<:farming:731494200767676576>',
	'Donations': '<:donations:731494220929564693>',
	'Friendly': '<:friendly:731494222410022913>',
	'Talkative': '<:talkative:731494207373574154>',
	'Underdog': '<:underdog:731497811840991272>',
	'Relaxed': '<:relaxed_:731498132839333992>',
	'Competitive': '<:competitive:731494196359463014>',
	'Newbie Friendly': '<:newbie:731494204072656916>'
};

export const PLAYER_LABELS: Emojis = {
	'Clan Wars': '<:clan_wars:731494209449885738>',
	'Clan War League': '<:clan_war_league:731494200205639750>',
	'Trophy Pushing': '<:trophy_pushing:731494210703720571>',
	'Friendly Wars': '<:friendly_wars:731494223416655892>',
	'Clan Games': '<:clan_games:731494204668379216>',
	'Builder Base': '<:builder_base:731494215309197352>',
	'Base Designing': '<:base_designing:731494224763289620>',
	'Farming': '<:farming:731494200767676576>',
	'Active Donator': '<:donations:731494220929564693>',
	'Active Daily': '<:active_daily:731494203418214400>',
	'Hungry Learner': '<:hungry_learner:731494202952646706>',
	'Friendly': '<:friendly:731494222410022913>',
	'Talkative': '<:talkative:731494207373574154>',
	'Teacher': '<:teacher:731494201849806900>',
	'Competitive': '<:competitive:731494196359463014>',
	'Veteran': '<:veteran:731494218111123527>',
	'Newbie': '<:newbie:731494204072656916>',
	'Amateur Attacker': '<:amateur_attacker:731494197940715550>'
};

export const WAR_STARS = {
	OLD: '<:star_old:812613069703872543>',
	NEW: '<:star_new:812625750809116704>',
	EMPTY: '<:star_empty:812613069372522518>'
};

export const EMOJIS = {
	EXP: '<:eXP:706910526373888060>',
	VS: '<:VS:816236784739680277>',
	GAP: '<:gap:824509600664387596>',
	ACTIVITY: '<:activity:825028424728051732>',

	STAR: '<:star_new:812625750809116704>',
	WAR_STAR: '<:star_solid:812633571432464415>',
	THREE_STARS: '<:stars_three:812613068906561546>',
	EMPTY_THREE_STARS: '<:stars_three_empty:812615581241049139>',

	FIRE: '<:dest:806556874623025212>',
	DESTRUCTION: '<:dest:806556874623025212>',

	SWORD: '<:sword_solid:812547118995996701>',
	CROSS_SWORD: '<:cross_sword:812567610985807893>',
	EMPTY_SWORD: '<:sword_empty:812547119546105866>',

	CLAN: '<:clan:696297353216262176>',

	OK: '<:tick:824673558663921734>',
	WRONG: '<:wrong:696314714535231538>',
	EMPTY: '<:empty:699639532013748326>',

	SUPER_TROOP: '<:super_troop:831563848174927883>',
	TOWNHALL: '<:TownHall:825424125065166919>',
	TROPHY: '<:trophy:696297701423448095>',
	VERSUS_TROPHY: '<:versustrophies:696299029746679860>',
	CLASHPERK: '<:clashperk:696314694780321875>',
	OWNER: '<:owner:696314724765139014>',
	TROOPS_DONATE: '<:troopsdonation:696314739889799198>',
	SPELL_DONATE: '<:spellsdonation:696314747989000293>',
	SHIELD: '<:shield:696297690606075924>',
	DISCORD: '<:discord:696317142307700747>',
	CWL: '<:cwl:813807811028713523>',
	CLOCK: '<:cpclock:701085554691014667>',
	LOADING: '<a:loading:696328441146114050>',
	USERS: '<:users:699834141931339777>',
	USER_RED: '<:memred:721788624835838054>',
	USER_BLUE: '<:memblue:721787113414197259>',
	AUTHORIZE: '<:cauth:701085545555689503>',
	VERIFIED: '<:verified:803884634768408577>',
	BOT_DEV: '<:botdev:707231318857089136>',
	UP_KEY: '<:donated:712617495587979306>',
	DOWN_KEY: '<:received:712617494904438855>',
	COC_LOGO: '<:clash:716274886506709003>',
	HASH: '<:chash:731418702875983884>',
	NODEJS: '<:nodejs:723162041095028797>',
	CLAN_GAMES: '<:cg:765244426444079115>',
	GOLD: '<:gold:766199291068416040>',
	ELIXIER: '<:elixir:766199063145611301>',
	DARK_ELIXIR: '<:darkelixir:766199057718706216>',
	BUILDER_GOLD: '<:bhgold:808989316222287932>',
	BUILDER_ELIXIR: '<:bhelixir:808989315211984956>'
};
