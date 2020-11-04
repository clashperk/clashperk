const codes = {
	504: '504 Request Timeout',
	400: 'Client provided incorrect parameters for the request.',
	403: 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'Looks like the tag is invalid!',
	429: 'Request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'Unknown error happened when handling the request.',
	503: 'Service is temporarily unavailable because of maintenance.'
};

module.exports = {
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

	Op: {
		DONATION_LOG: 0,
		CLAN_MEMBER_LOG: 1,
		LAST_ONLINE_LOG: 3,
		CLAN_EMBED_LOG: 4,
		CLAN_GAMES_LOG: 5,
		CLAN_WAR_LOG: 6
	}
};
