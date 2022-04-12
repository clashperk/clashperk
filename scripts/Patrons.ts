import env from 'dotenv';
env.config();

import fetch from 'node-fetch';
import qs from 'querystring';

import { Database } from '../src/bot/struct/Database';
import { Collections } from '../src/bot/util/Constants';
import { Included, Member } from '../src/bot/struct/Patrons';

(async () => {
	await Database.connect().then(() => console.log('MongoDB Connected!'));
	const collection = Database.db('clashperk').collection(Collections.PATRONS);

	const query = qs.stringify({
		'page[size]': 500,
		'fields[tier]': 'amount_cents,created_at',
		'include': 'user,currently_entitled_tiers',
		'fields[user]': 'social_connections,email,full_name,email,image_url',
		'fields[member]':
			'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,lifetime_support_cents'
	});

	const data = (await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
		headers: { authorization: `Bearer ${process.env.PATREON_API!}` },
		timeout: 10000
	})
		.then((res) => res.json())
		.catch(() => null)) as { data: Member[]; included: Included[] };

	const patrons = await collection.find({ active: true }).toArray();
	console.log('\n========= DELETED PATRONS ========');
	patrons.forEach((patron) => {
		const f = data.data.find((entry) => entry.relationships.user.data.id === patron.id);
		if (!f) console.log(patron.name, patron.userId);
	});

	console.log('\n========= PENDING PATRONS ========');
	data.included.forEach((entry: any) => {
		const d = patrons.find((p) => p.id === entry?.id);
		const pledge = data.data.find((en) => en.relationships.user.data.id === entry.id);
		if (!d && pledge?.attributes.patron_status === 'active_patron')
			console.log(entry?.attributes.full_name, entry?.attributes.email, entry.id);
	});

	console.log('\n========= DECLINED PATRONS ========');
	data.included.forEach((entry: any) => {
		const d = patrons.find((p) => p.id === entry?.id);
		const pledge = data.data.find((en: any) => en?.relationships?.patron?.data?.id === entry.id);
		if (d && pledge?.attributes.patron_status === 'declined_patron') console.log(entry?.attributes.full_name, entry?.id);
	});

	return Database.close();
})();
