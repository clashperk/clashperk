export const HOME_HEROES: { [key: string]: string } = {
	'Barbarian King': '<:BarbarianKing:696305370682884111>',
	'Archer Queen': '<:ArcherQueen:696305403046133780>',
	'Grand Warden': '<:GrandWarden:841295204476780586>',
	'Royal Champion': '<:RoyalChampion:813806447934308422>'
};

export const ELIXIR_TROOPS: { [key: string]: string } = {
	'Barbarian': '<:Barbarian:696280898122809344>',
	'Archer': '<:Archer:696280941005504592>',
	'Giant': '<:Giant:696280991697731585>',
	'Goblin': '<:Goblin:696281044764327966>',
	'Wall Breaker': '<:WallBreaker:696281102637334539>',
	'Balloon': '<:Balloon:696281155250683915>',
	'Wizard': '<:Wizard:696281232971137084>',
	'Healer': '<:Healer:696281319394639982>',
	'Dragon': '<:Dragon:696281449820848158>',
	'P.E.K.K.A': '<:PEKKA:696281471127912468>',
	'Baby Dragon': '<:BabyDragon:696281500018278400>',
	'Miner': '<:Miner:696281535111757895>',
	'Electro Dragon': '<:ElectroDragon:696281556930527352>',
	'Yeti': '<:Yeti:696281814293282857>',
	'Dragon Rider': '<:DragonRider:854290952888909834>'
};

export const HERO_PETS: { [key: string]: string } = {
	'Electro Owl': '<:Owl:831123515939356703>',
	'L.A.S.S.I': '<:LASSI:831123509827731527>',
	'Mighty Yak': '<:Yak:831123515067334707>',
	'Unicorn': '<:Unicorn:831123514613694564>'
};

export const DARK_ELIXIR_TROOPS: { [key: string]: string } = {
	'Minion': '<:Minion:696281875794231326>',
	'Hog Rider': '<:HogRider:696281961257238579>',
	'Valkyrie': '<:valkyrie:696282003158597662>',
	'Golem': '<:Golem:696282074788659250>',
	'Witch': '<:Witch:696282143508267068>',
	'Lava Hound': '<:LavaHound:696282183832305685>',
	'Bowler': '<:bowler:696282213360074782>',
	'Ice Golem': '<:IceGolem:696282324798799892>',
	'Headhunter': '<:Headhunter:724650414066106459>'
};

export const SIEGE_MACHINES: { [key: string]: string } = {
	'Wall Wrecker': '<:WallWrecker:696282434278522931>',
	'Battle Blimp': '<:BattleBlimp:696282472480112731>',
	'Stone Slammer': '<:StoneSlammer:696282610472714271>',
	'Siege Barracks': '<:SiegeBarracks:696282751988400199>',
	'Log Launcher': '<:LogLauncher:918762884257939478>',
	'Flame Flinger': '<:FlameFlinger:918762753013981235>'
};

export const ELIXIR_SPELLS: { [key: string]: string } = {
	'Lightning Spell': '<:Lightning:785740412010364958>',
	'Healing Spell': '<:Healing:696302035913670737>',
	'Rage Spell': '<:Rage:696302044343959572>',
	'Jump Spell': '<:Jump:696302055681425438>',
	'Freeze Spell': '<:Freeze:696302064992780299>',
	'Clone Spell': '<:Clone:696302107950710795>',
	'Invisibility Spell': '<:Invisible:787186410032463882>'
};

export const DARK_SPELLS: { [key: string]: string } = {
	'Poison Spell': '<:Poison:696302119434846231>',
	'Earthquake Spell': '<:Earthquake:696302170957414460>',
	'Haste Spell': '<:Haste:696302178763276348>',
	'Skeleton Spell': '<:Skeleton:696302204348530698>',
	'Bat Spell': '<:Bat:696303291176583198>'
};

export const SUPER_TROOPS: { [key: string]: string } = {
	'Super Barbarian': '<:SuperBarbarian:789730407360495646>',
	'Super Archer': '<:SuperArcher:789730408673181717>',
	'Super Giant': '<:SuperGiant:789730409051193364>',
	'Sneaky Goblin': '<:SuperGoblin:789730408102232064>',
	'Super Wall Breaker': '<:SuperWallBreaker:789730406206275595>',
	'Rocket Balloon': '<:RocketBalloon:854290612081655838>',
	'Super Wizard': '<:SuperWizard:789730402189049876>',
	'Super Dragon': '<:SuperDragon:918762776619536474>',
	'Inferno Dragon': '<:SuperBabyDragon:789730408878309376>',
	'Super Minion': '<:SuperMinion:789730407930920990>',
	'Super Valkyrie': '<:SuperValkyrie:789730405967462440>',
	'Super Witch': '<:SuperWitch:789730409210576897>',
	'Ice Hound': '<:IceHound:789730401816018945>',
	'Super Bowler': '<:SuperBowler:892028277252825128>'
};

export const BUILDER_ELIXIR_TROOPS: { [key: string]: string } = {
	'Raged Barbarian': '<:RagedBarbarian:696283193426575390>',
	'Sneaky Archer': '<:SneakyArcher:696283216687923223>',
	'Boxer Giant': '<:BoxerGiant:696283264968556555>',
	'Beta Minion': '<:BetaMinion:696283283910295552>',
	'Bomber': '<:Bomber:696283305493921842>',
	'Baby Dragon': '<:BabyDragon:696281500018278400>',
	'Cannon Cart': '<:CannonCart:696283381654093854>',
	'Night Witch': '<:NightWitch:696283537145462814>',
	'Drop Ship': '<:DropShip:696283560373387305>',
	'Super P.E.K.K.A': '<:SuperPEKKA:696283614891081769>',
	'Hog Glider': '<:HogGlider:696289358780563489>'
};

export const BUILDER_HEROES: { [key: string]: string } = {
	'Battle Machine': '<:WarMachine:696305434570522665>'
};

export const HEROES: { [key: string]: string } = {
	...HOME_HEROES,
	...BUILDER_HEROES
};

export const HOME_TROOPS: { [key: string]: string } = {
	...HOME_HEROES,
	...ELIXIR_TROOPS,
	...DARK_ELIXIR_TROOPS,
	...SIEGE_MACHINES,
	...ELIXIR_SPELLS,
	...DARK_SPELLS,
	...HERO_PETS
};

export const BUILDER_TROOPS: { [key: string]: string } = {
	...BUILDER_ELIXIR_TROOPS,
	...BUILDER_HEROES
};

export const TOWN_HALLS: { [key: string]: string } = {
	1: '<:TownHall1:696304616173993994>',
	2: '<:TownHall2:696304646771179540>',
	3: '<:TownHall3:696304661061173289>',
	4: '<:TownHall4:696304680468348968>',
	5: '<:TownHall5:696304696360435742>',
	6: '<:TownHall6:696304709144674315>',
	7: '<:TownHall7:696304727465394176>',
	8: '<:TownHall8:696304744414576640>',
	9: '<:TownHall9:696304757496610856>',
	10: '<:TownHall10:696304773225250858>',
	11: '<:TownHall11:696304807723663400>',
	12: '<:TownHall12:766206520492818482>',
	13: '<:TownHall13:766207117103071242>',
	14: '<:TownHall14:829392900110549038>'
};

export const BUILDER_HALLS: { [key: string]: string } = {
	1: '<:BuilderHall1:696304006590365705>',
	2: '<:BuilderHall2:696304029872947211>',
	3: '<:BuilderHall3:696304259297181756>',
	4: '<:BuilderHall4:696304286233002035>',
	5: '<:BuilderHall5:696304314897006662>',
	6: '<:BuilderHall6:696304332068618320>',
	7: '<:BuilderHall7:696304359209959494>',
	8: '<:BuilderHall8:696304386183397396>',
	9: '<:BuilderHall9:766206733541572618>'
};

export const PLAYER_LEAGUES: { [key: string]: string } = {
	29000000: '<:no_league:696307595924996107>',
	29000001: '<:Bronze3:696300941011451945>',
	29000002: '<:Bronze2:696300909218627614>',
	29000003: '<:Bronze3:696300871188742154>',
	29000004: '<:Silver3:696301558643687435>',
	29000005: '<:Silver2:696301546345988117>',
	29000006: '<:Silver1:696301503102713866>',
	29000007: '<:Gold3:696301177310150666>',
	29000008: '<:Gold2:696301155273146429>',
	29000009: '<:Gold1:696301052970008616>',
	29000010: '<:Crystal3:696301325696368700>',
	29000011: '<:Crystal2:696301312949747834>',
	29000012: '<:Crystal1:696301295535128646>',
	29000013: '<:Master3:696301488481239070>',
	29000014: '<:Master2:696301457183604796>',
	29000015: '<:Master1:696301370923417660>',
	29000016: '<:Champion3:696301636460478514>',
	29000017: '<:Champion2:696301614813675520>',
	29000018: '<:Champion1:696301596451012688>',
	29000019: '<:Titan3:696301740143804456>',
	29000020: '<:Titan2:696301700964810792>',
	29000021: '<:Titan1:696301653258797056>',
	29000022: '<:legend:696301773513818162>'
};

export const ACHIEVEMENT_STARS: { [key: string]: string } = {
	0: '<:0stars:696294293782003722>',
	1: '<:1star:696294317932675122>',
	2: '<:2stars:696294341186158593>',
	3: '<:3stars:696294365663985674>'
};

export const CWL_LEAGUES: { [key: string]: string } = {
	'Champion League I': '<:Champion1:717735571933364334>',
	'Champion League II': '<:Champion2:717735583962759228>',
	'Champion League III': '<:Champion3:717735599184019598>',
	'Crystal League I': '<:Crystal1:717735618146467863>',
	'Crystal League II': '<:Crystal2:717735624815149107>',
	'Crystal League III': '<:Crystal3:717735631815704606>',
	'Master League I': '<:Master1:717735642708049967>',
	'Master League II': '<:Master2:717735651491053671>',
	'Master League III': '<:Master3:717735658113990738>',
	'Gold League I': '<:Gold1:717735671623843852>',
	'Gold League II': '<:Gold2:717735681589379185>',
	'Gold League III': '<:Gold3:717735697687248897>',
	'Silver League I': '<:Silver1:717735708839903304>',
	'Silver League II': '<:Silver2:717735717031378984>',
	'Silver League III': '<:Silver3:717735724937379870>',
	'Bronze League I': '<:Bronze1:717735738363609168>',
	'Bronze League II': '<:Bronze2:717735744856391702>',
	'Bronze League III': '<:Bronze3:717735755815976981>'
};

export const CLAN_LABELS: { [key: string]: string } = {
	'Clan Wars': '<:ClanWars:731494209449885738>',
	'Clan War League': '<:ClanWarLeague:731494200205639750>',
	'Trophy Pushing': '<:TrophyPushing:731494210703720571>',
	'Friendly Wars': '<:FriendlyWars:731494223416655892>',
	'Clan Games': '<:ClanGames:731494204668379216>',
	'Builder Base': '<:BuilderBase:731494215309197352>',
	'Base Designing': '<:BaseDesigning:731494224763289620>',
	'International': '<:International:731494220724043807>',
	'Farming': '<:Farming:731494200767676576>',
	'Donations': '<:Donations:731494220929564693>',
	'Friendly': '<:Friendly:731494222410022913>',
	'Talkative': '<:Talkative:731494207373574154>',
	'Underdog': '<:Underdog:731497811840991272>',
	'Relaxed': '<:Relaxed:731498132839333992>',
	'Competitive': '<:Competitive:731494196359463014>',
	'Newbie Friendly': '<:NewbieFriendly:731494204072656916>'
};

export const PLAYER_LABELS: { [key: string]: string } = {
	'Clan Wars': '<:ClanWars:731494209449885738>',
	'Clan War League': '<:ClanWarLeague:731494200205639750>',
	'Trophy Pushing': '<:TrophyPushing:731494210703720571>',
	'Friendly Wars': '<:FriendlyWars:731494223416655892>',
	'Clan Games': '<:ClanGames:731494204668379216>',
	'Builder Base': '<:BuilderBase:731494215309197352>',
	'Base Designing': '<:BaseDesigning:731494224763289620>',
	'Farming': '<:Farming:731494200767676576>',
	'Active Donator': '<:Donations:731494220929564693>',
	'Active Daily': '<:ActiveDaily:731494203418214400>',
	'Hungry Learner': '<:HungryLearner:731494202952646706>',
	'Friendly': '<:Friendly:731494222410022913>',
	'Talkative': '<:Talkative:731494207373574154>',
	'Teacher': '<:Teacher:731494201849806900>',
	'Competitive': '<:Competitive:731494196359463014>',
	'Veteran': '<:Veteran:731494218111123527>',
	'Newbie': '<:Newbie:731494204072656916>',
	'Amateur Attacker': '<:AmateurAttacker:731494197940715550>'
};

export const WAR_STARS = {
	OLD: '<:OldStar:812613069703872543>',
	NEW: '<:Star:812625750809116704>',
	EMPTY: '<:EmptyStar:812613069372522518>'
};

export const EMOJIS = {
	EXP: '<:eXP:706910526373888060>',
	VS: '<:VS:816236784739680277>',
	VS_BLUE: '<:VSBlue:913783545099587614>',
	GAP: '<:Gap:824509600664387596>',
	ACTIVITY: '<:Activity:825028424728051732>',
	HEROES: '<:Heroes:838837719866146826>',
	ONLINE: '<:Online:876358512010227722>',

	STAR: '<:Star:812625750809116704>',
	WAR_STAR: '<:WarStars:812633571432464415>',
	THREE_STARS: '<:ThreeStars:812613068906561546>',
	EMPTY_THREE_STARS: '<:EmptyThreeStars:812615581241049139>',

	FIRE: '<:Fire:806556874623025212>',
	DESTRUCTION: '<:Fire:806556874623025212>',

	SPELLS: '<:Spells:854686656762609674>',
	TROOPS: '<:Troops:854686652474458122>',

	SWORD: '<:Sword:812547118995996701>',
	CROSS_SWORD: '<:CrossSword:812567610985807893>',
	EMPTY_SWORD: '<:EmptySword:812547119546105866>',

	CLAN: '<:ClanIcon:696297353216262176>',

	OK: '<:GreenTick:824673558663921734>',
	WRONG: '<:RedCross:696314714535231538>',
	EMPTY: '<:EmptyBlock:699639532013748326>',

	SUPER_TROOP: '<:SuperTroop:831563848174927883>',
	TOWNHALL: '<:TownHall:825424125065166919>',
	TROPHY: '<:Trophy:696297701423448095>',
	VERSUS_TROPHY: '<:VersusTrophy:696299029746679860>',
	CLASHPERK: '<:ClashPerk:696314694780321875>',
	OWNER: '<:Owner:696314724765139014>',
	TROOPS_DONATE: '<:TroopDonations:696314739889799198>',
	SPELL_DONATE: '<:SpellDonations:696314747989000293>',
	SHIELD: '<:Shield:696297690606075924>',
	DISCORD: '<:Discord:696317142307700747>',
	CWL: '<:CWL:813807811028713523>',
	CLOCK: '<:Clock:701085554691014667>',
	LOADING: '<a:Loading:696328441146114050>',
	USERS: '<:Users:699834141931339777>',
	USER_RED: '<:UserRed:721788624835838054>',
	USER_BLUE: '<:UserBlue:721787113414197259>',
	AUTHORIZE: '<:Authorized:701085545555689503>',
	VERIFIED: '<:Verified:803884634768408577>',
	BOT_DEV: '<:BotDev:707231318857089136>',
	UP_KEY: '<:UPKey:712617495587979306>',
	DOWN_KEY: '<:DownKey:712617494904438855>',
	COC_LOGO: '<:ClashLogo:716274886506709003>',
	HASH: '<:Hash:731418702875983884>',
	NODEJS: '<:NodeJS:723162041095028797>',
	CLAN_GAMES: '<:ClanGames:765244426444079115>',
	GOLD: '<:Gold:766199291068416040>',
	ELIXIR: '<:Elixir:766199063145611301>',
	DARK_ELIXIR: '<:DarkElixir:766199057718706216>',
	BUILDER_GOLD: '<:BuilderGold:808989316222287932>',
	BUILDER_ELIXIR: '<:BuilderElixir:808989315211984956>'
};
