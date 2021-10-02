import env from 'dotenv';
env.config();

import fetch from 'node-fetch';
import qs from 'querystring';

import { Connection } from '../src/bot/struct/Database';
import { Collections } from '../src/bot/util/Constants';

(async () => {
	await Connection.connect().then(() => console.log('MongoDB Connected!'));
	const collection = Connection.db('clashperk').collection(Collections.PATRONS);

	const query = qs.stringify({ 'include': 'patron.null', 'page[count]': 200, 'sort': 'created' });
	const data = await fetch(`https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?${query}`, {
		headers: { authorization: `Bearer ${process.env.PATREON_API!}` }, timeout: 10000
	}).then(res => res.json()).catch(() => null);
	const patrons = await collection.find({ active: true }).toArray();

	console.log('\n========= DELETED PATRONS ========');
	patrons.forEach(patron => {
		const f = data.data.find((entry: any) => entry?.relationships?.patron?.data?.id === patron.id);
		if (!f) console.log(patron.name, patron.discord_id);
	});

	console.log('\n========= PENDING PATRONS ========');
	data.included.forEach((entry: any) => {
		const d = patrons.find(p => p.id === entry?.id);
		const pledge = data.data.find((en: any) => en?.relationships?.patron?.data?.id === entry.id);
		if (!d && !pledge.attributes.declined_since) console.log(entry?.attributes.full_name, entry?.attributes.email);
	});

	return Connection.close();
})();
