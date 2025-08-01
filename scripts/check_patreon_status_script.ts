import { config } from 'dotenv';
config();

import { Collections } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import { mongoClient } from '../src/struct/database.js';
import { PatreonMember, PatreonUser } from '../src/struct/patreon-handler.js';

const getSubscribers = async () => {
  const query = new URLSearchParams({
    'page[size]': '1000',
    'fields[tier]': 'amount_cents,created_at',
    'include': 'user,currently_entitled_tiers',
    'fields[user]': 'social_connections,email,full_name,email,image_url',
    'fields[member]':
      'last_charge_status,last_charge_date,patron_status,email,pledge_relationship_start,currently_entitled_amount_cents,campaign_lifetime_support_cents,is_gifted,note'
  }).toString();

  const res = await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/2589569/members?${query}`, {
    headers: { authorization: `Bearer ${process.env.PATREON_API_KEY}` }
  });

  return (await res.json()) as { data: PatreonMember[]; included: PatreonUser[] };
};

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const collection = mongoClient.db('clashperk').collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);

  const result = await getSubscribers();

  const members = await collection.find({ active: true }).toArray();

  console.log('\n========= DELETED MEMBERS ========');
  members.forEach((patron) => {
    const member = result.data.find((m) => m.relationships.user.data.id === patron.id);
    if (!member) console.log(patron.name, patron.userId);
  });

  console.log('\n========= PENDING MEMBERS ========');
  result.included.forEach((user) => {
    const patron = members.find((m) => m.id === user?.id);
    const pledge = result.data.find((m) => m.relationships.user.data.id === user.id);
    if (!patron && pledge?.attributes.patron_status === 'active_patron') {
      console.log(user?.attributes.full_name, user?.attributes.email, user.id);
    }
  });

  console.log('\n========= DECLINED MEMBERS ========');
  result.included.forEach((user) => {
    const patron = members.find((p) => p.id === user?.id);
    const pledge = result.data.find((m) => m.relationships.user.data.id === user.id);
    if (patron && pledge?.attributes.patron_status === 'declined_patron') console.log(user?.attributes.full_name, user?.id);
  });

  return mongoClient.close();
})();
