/* eslint-disable func-names */
require('dotenv').config();
const util = require('util');
const { mongodb } = require('./src/app/struct/Database');
const { ObjectId } = require('mongodb');
const moment = require('moment');

const num = [
	0, 1, 2, 3, 4, 5, 6, 7,
	8, 9, 10, 11, 12, 13, 14, 15,
	16, 17, 18, 19, 20, 21, 22, 23
];
const now = new Date();
const hour = now.getUTCHours();
let index = num.indexOf(hour);
const g = new Array(24).fill()
	.map((_, i) => {
		// const j = `${num[index].toString().padStart(2, '0')}:00`;
		index += 1;
		// index = index >= 0 ? index : num.length - (~index + 2);
		return {
			time: new Date(new Date() - (60 * 60 * 1000 * i))
				.toISOString()
				.substring(0, 14)
				.concat('00'),
			count: 0
		};
	});

(async function() {
	await mongodb.connect().then(() => console.log('Connected'));
	const cd = await mongodb.db('clashperk')
		.collection('clanactivities')
		.findOne({ 'members.#9Q92C8R20': { $exists: true } });
	// console.log(util.inspect(cd, { depth: 3 }));
	for (const m of Object.values(cd.members)) {
		if (!m.activities) continue;
		for (const d of Object.keys(m.activities)) {
			const ii = g.find(x => x.time === d);
			if (ii) {
				ii.count += 1;
			}
		}
	}

	console.log(g);
	console.log(g.map(d => `${moment(new Date(`${d.time}Z`)).format('hh:mm A')} : ${d.count}`));
})();

// console.log(g);
