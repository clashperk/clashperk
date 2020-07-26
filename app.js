
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
		++i;
		const j = i % 2 === 0 ? `${num[index].toString().padStart(2, '0')}:00` : '';
		index -= 1;
		index = index >= 0 ? index : num.length - (~index + 2);
		return j;
	});

console.log(g);
