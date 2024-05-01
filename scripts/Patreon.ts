import fetch from 'node-fetch';

import { PatreonMembersEntity } from '../src/bot/entities/patrons.entity.js';
import { mongoClient } from '../src/bot/struct/Database.js';
import { Included, Member } from '../src/bot/struct/PatreonHandler.js';
import { Collections } from '../src/bot/util/Constants.js';

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const collection = mongoClient.db('clashperk').collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);

  const query = new URLSearchParams({
    'page[size]': '1000',
    'fields[tier]': 'amount_cents,created_at',
    'include': 'user,currently_entitled_tiers',
    'fields[user]': 'social_connections,email,full_name,email,image_url',
    'fields[member]':
      'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,lifetime_support_cents'
  }).toString();

  const data = (await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
    headers: { authorization: `Bearer ${process.env.PATREON_API!}` }
  })
    .then((res) => res.json())
    .catch(() => null)) as { data: Member[]; included: Included[] };

  const members = await collection.find({ active: true }).toArray();
  console.log('\n========= DELETED MEMBERS ========');
  members.forEach((patron) => {
    const f = data.data.find((entry) => entry.relationships.user.data.id === patron.id);
    if (!f) console.log(patron.name, patron.userId);
  });

  console.log('\n========= PENDING MEMBERS ========');
  data.included.forEach((entry: any) => {
    const d = members.find((p) => p.id === entry?.id);
    const pledge = data.data.find((en) => en.relationships.user.data.id === entry.id);
    if (!d && pledge?.attributes.patron_status === 'active_patron')
      console.log(entry?.attributes.full_name, entry?.attributes.email, entry.id);
  });

  console.log('\n========= DECLINED MEMBERS ========');
  data.included.forEach((entry: any) => {
    const d = members.find((p) => p.id === entry?.id);
    const pledge = data.data.find((en: any) => en?.relationships?.patron?.data?.id === entry.id);
    if (d && pledge?.attributes.patron_status === 'declined_patron') console.log(entry?.attributes.full_name, entry?.id);
  });

  return mongoClient.close();
})();
