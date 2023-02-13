import fetch from 'node-fetch';
import { nanoid } from 'nanoid';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sizes = {
	1: { width: 500, height: 300 },
	3: { width: 800, height: 400 },
	7: { width: 800, height: 400 },
	24: { width: 800, height: 400 }
};

export default {
	async activity(collection: any[] = [], title: string[], days = 1): Promise<string> {
		const colors = ['#266ef7', '#c63304', '#ffc107', '#50c878', '#ffac75', '#4dc1fa', '#cb5aff'];
		days = collection.length > 3 ? 3 : days;
		const datasets = collection.map((obj: any, i) => ({
			label: obj.name,
			type: days > 7 ? 'bar' : 'line',
			fill: false,
			backgroundColor: colors[i],
			borderColor: colors[i],
			borderWidth: 2,
			pointBorderColor: colors[i],
			pointBackgroundColor: colors[i],
			pointRadius: 2,
			data: [...obj.data.map((d: any) => d.count)]
		}));

		const body = {
			backgroundColor: 'white',
			width: sizes[days as keyof typeof sizes].width,
			height: sizes[days as keyof typeof sizes].height,
			devicePixelRatio: 2.0,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection[0].data.map((d: any) => d.short)],
					datasets: [...datasets]
				},
				options: {
					responsive: false,
					legend: {
						position: 'top',
						display: true,
						labels: {
							fontSize: 10,
							padding: 4
						}
					},
					title: {
						display: true,
						fontSize: 10,
						padding: 2,
						text: [...title]
					}
				}
			}
		};

		const url = `https://chart.clashperk.com/${nanoid()}`;
		await fetch(url, {
			body: JSON.stringify(body),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		}).then((res) => res.json());
		return url;
	},

	async growth(collection: any[] = [], { addition, deletion, growth }: { addition: number; deletion: number; growth: number }) {
		const total = collection.reduce((pre, curr) => Number(pre) + Number(curr.value.addition - curr.value.deletion), 0);
		const body = {
			backgroundColor: 'white',
			width: 500,
			height: 300,
			devicePixelRatio: 2.0,
			format: 'png',
			chart: {
				type: 'bar',
				data: {
					labels: [...collection.map((d: any) => `${months[d.date.getMonth()]!} ${d.date.getDate() as number}`)],
					datasets: [
						{
							type: 'bar',
							label: `Addition`,
							backgroundColor: '#36a2eb80',
							borderColor: '#36a2eb',
							data: [...collection.map((d) => d.value.addition)]
						},
						{
							type: 'bar',
							label: 'Deletion',
							backgroundColor: '#ff638480',
							borderColor: '#ff6384',
							data: [...collection.map((d) => Math.abs(d.value.deletion))]
						},
						{
							type: 'line',
							label: 'Growth',
							backgroundColor: '#69c49a',
							borderColor: '#69c49a',
							fill: false,
							data: [...collection.map((d) => d.value.addition - d.value.deletion)]
						}
					]
				},
				options: {
					responsive: false,
					legend: {
						position: 'top',
						display: true,
						labels: {
							fontSize: 10,
							padding: 4
						}
					},
					title: {
						display: true,
						fontSize: 10,
						padding: 2,
						text: [`Total ${total as number} | Server Growth (${collection.length}D) | Today ${addition}/${deletion}/${growth}`]
					}
				}
			}
		};

		const url = `https://chart.clashperk.com/${nanoid()}`;
		await fetch(url, {
			body: JSON.stringify(body),
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		}).then((res) => res.json());

		return url;
	}
};
