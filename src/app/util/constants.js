const { MessageEmbed } = require('discord.js');
const admin = require('firebase-admin');

const codes = {
	504: '504 Request Timeout',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'Invalid tag, resource was not found.',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temprorarily unavailable because of maintenance.'
};

module.exports = {
	StarEmoji: {
		0: '<:0star:629338413837058083>',
		1: '<:1star:534763506227085322>',
		2: '<:2star:534763506185142272>',
		3: '<:3star:534763506067570705>'
	},
	HeroEmojis: {
		'Barbarian King': '<:barbarianking:524939911581663242>',
		'Archer Queen': '<:archerqueen:524939902408720394>',
		'Grand Warden': '<:grandwarden:524939931303411722>',
		'Battle Machine': '<:warmachine:524939920943349781>',
		'Royal Champion': '<:royal_champion:653967122166185995>'
	},
	TownHallEmoji: {
		2: '<:townhall2:534745498561806357>',
		3: '<:townhall3:534745539510534144>',
		4: '<:townhall4:534745571798286346>',
		5: '<:townhall5:534745574251954176>',
		6: '<:townhall6:534745574738624524>',
		7: '<:townhall7:534745575732805670>',
		8: '<:townhall8:534745576802353152>',
		9: '<:townhall9:534745577033039882>',
		10: '<:townhall10:534745575757709332>',
		11: '<:townhall11:534745577599270923>',
		12: '<:townhall12:534745574981894154>',
		13: '<:townhall13:653959735124426814>'
	},
	leagueEmojis: {
		29000000: '<:no_league:524912313531367424>',
		29000001: '<:bronze3:524912314332348416>',
		29000002: '<:bronze2:524912314500251651>',
		29000003: '<:bronze1:524912313535561731>',
		29000004: '<:silver3:524912314680475659>',
		29000005: '<:silver2:524104101043372033>',
		29000006: '<:silver1:524102934871670786>',
		29000007: '<:gold3:524102875505229835>',
		29000008: '<:gold2:524102825589080065>',
		29000009: '<:gold1:524102616125276160>',
		29000010: '<:crystal3:525624971456937984>',
		29000011: '<:crystal2:524096411927576596>',
		29000012: '<:crystal1:524094240658292746>',
		29000013: '<:master3:524096647366705152>',
		29000014: '<:master2:524096587224580115>',
		29000015: '<:master1:524096526499446794>',
		29000016: '<:champion3:524093027099344907>',
		29000017: '<:champion2:524091846226345984>',
		29000018: '<:champion1:524091132498411520>',
		29000019: '<:titan3:524084656790962186>',
		29000020: '<:titan2:524089454206386199>',
		29000021: '<:titan1:524087152183607329>',
		29000022: '<:legend:524089797023760388>',
		29000023: '<:legend:524089797023760388>',
		29000024: '<:legend:524089797023760388>',
		29000025: '<:legend:524089797023760388>'
	},
	TroopEmojis: {
		'Barbarian': '<:barbarian:524921080951865354>',
		'Archer': '<:archer:524921038862024723>',
		'Goblin': '<:goblin:524921092368891925>',
		'Giant': '<:giant:524921093652348955>',
		'Wall Breaker': '<:wallbreaker:524921094814171147>',
		'Balloon': '<:balloonc:524921095363493912>',
		'Wizard': '<:wizard:524921085645291522>',
		'Healer': '<:healer:524921090196242432>',
		'Dragon': '<:dragonc:524921090884108288>',
		'P.E.K.K.A': '<:pekka:524921093753012227>',
		'Yeti': '<:yeti:653963810482290719>',
		'Minion': '<:minion:524921093132255232>',
		'Hog Rider': '<:hogrider:524921085561667584>',
		'Valkyrie': '<:valkyrie:524921093031723019>',
		'Golem': '<:golem:524921095300579328>',
		'Witch': '<:witch:524921091383099404>',
		'Lava Hound': '<:lavahound:524921094185156619>',
		'Bowler': '<:bowler:524921085024534528>',
		'Baby Dragon': '<:babydragon:524921039004631050>',
		'Miner': '<:miner:524921087461425162>',
		'Electro Dragon': '<:electrodragon:524921092213833750>',
		'Ice Golem': '<:ice_golem:627156215394467851>',
		'Battle Blimp': '<:battleblimp:524921096345092126>',
		'Wall Wrecker': '<:wallwrecker:524921096655339520>',
		'Stone Slammer': '<:Stone_Slammer_info:524937839457337374>',
		'Siege Barracks': '<:siege_barracks:658299037476454411>',
		'Super Barbarian': '<:barb_p:694426126159708201>',
		'Super Wall Breaker': '<:breakerp:694426092156485672>',
		'Super Giant': '<:giant_p:694426007092068393>',
		'Sneaky Goblin': '<:goblin_p:694426058317103164>'
	},
	BuilderTroops: {
		'Night Witch': '<:night_witch:627148850800492574>',
		'Baby Dragon': '<:baby_dragon:627148415473680415>',
		'Drop Ship': '<:drop_ship:627151120896098345>',
		'Cannon Cart': '<:cannon_cart:627148662547677204>',
		'Super P.E.K.K.A': '<:supper_pekka:627149954917466142>',
		'Bomber': '<:bomber:627148263233159188>',
		'Boxer Giant': '<:boxer_giant:627148013512556544>',
		'Beta Minion': '<:beta_minion:627148135373864960>',
		'Sneaky Archer': '<:skeaky_archer:627147702584606722>',
		'Raged Barbarian': '<:raged_barbarian:627147507717111808>',
		'Hog Glider': '<:hog_glider:658297486120583199>'
	},
	SpellEmojis: {
		'Lightning Spell': '<:lightning:524921197369229342>',
		'Healing Spell': '<:healing:524921190834503723>',
		'Rage Spell': '<:ragec:524921200900833280>',
		'Jump Spell': '<:jump:524921194437279745>',
		'Freeze Spell': '<:freeze:524921189290999818>',
		'Poison Spell': '<:poison:524921198312816641>',
		'Earthquake Spell': '<:earthquake:524921182659674122>',
		'Haste Spell': '<:haste:524921185549418506>',
		'Clone Spell': '<:clone:524921180910518272>',
		'Skeleton Spell': '<:skeleton:524921203975127049>',
		'Bat Spell': '<:Bat_Spell_info:524937829122441227>'
	},

	leagueId(bestTrophies) {
		let leagueId;
		if (bestTrophies <= 399) {
			leagueId = 29000000;
		} else if (bestTrophies >= 400 && bestTrophies <= 499) {
			leagueId = 29000001;
		} else if (bestTrophies >= 500 && bestTrophies <= 599) {
			leagueId = 29000002;
		} else if (bestTrophies >= 600 && bestTrophies <= 799) {
			leagueId = 29000003;
		} else if (bestTrophies >= 800 && bestTrophies <= 999) {
			leagueId = 29000004;
		} else if (bestTrophies >= 1000 && bestTrophies <= 1199) {
			leagueId = 29000005;
		} else if (bestTrophies >= 1200 && bestTrophies <= 1399) {
			leagueId = 29000006;
		} else if (bestTrophies >= 1400 && bestTrophies <= 1599) {
			leagueId = 29000007;
		} else if (bestTrophies >= 1600 && bestTrophies <= 1799) {
			leagueId = 29000008;
		} else if (bestTrophies >= 1800 && bestTrophies <= 1999) {
			leagueId = 29000009;
		} else if (bestTrophies >= 2000 && bestTrophies <= 2199) {
			leagueId = 29000010;
		} else if (bestTrophies >= 2200 && bestTrophies <= 2399) {
			leagueId = 29000011;
		} else if (bestTrophies >= 2400 && bestTrophies <= 2599) {
			leagueId = 29000012;
		} else if (bestTrophies >= 2600 && bestTrophies <= 2799) {
			leagueId = 29000013;
		} else if (bestTrophies >= 2800 && bestTrophies <= 2999) {
			leagueId = 29000014;
		} else if (bestTrophies >= 3000 && bestTrophies <= 3199) {
			leagueId = 29000015;
		} else if (bestTrophies >= 3200 && bestTrophies <= 3499) {
			leagueId = 29000016;
		} else if (bestTrophies >= 3500 && bestTrophies <= 3799) {
			leagueId = 29000017;
		} else if (bestTrophies >= 3800 && bestTrophies <= 4099) {
			leagueId = 29000018;
		} else if (bestTrophies >= 4100 && bestTrophies <= 4399) {
			leagueId = 29000019;
		} else if (bestTrophies >= 4400 && bestTrophies <= 4799) {
			leagueId = 29000020;
		} else if (bestTrophies >= 4800 && bestTrophies <= 4999) {
			leagueId = 29000021;
		} else if (bestTrophies >= 5000) {
			leagueId = 29000022;
		}

		return leagueId;
	},

	status(code) {
		return codes[code];
	},

	geterror(member, type) {
		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11)
			.setDescription([
				`Couldn't find a ${type} linked to **${member.user.tag}!**`,
				`Either provide a tag or link a ${type} to your Discord.`
			]);

		return embed;
	},

	fetcherror(code) {
		const embed = new MessageEmbed()
			.setAuthor('Error')
			.setColor(0xf30c11)
			.setDescription([
				`${codes[code]}`
			]);

		return embed;
	}
};
