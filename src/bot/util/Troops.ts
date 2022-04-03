export default {
	SUPER_TROOPS: [
		{
			name: 'Super Barbarian',
			id: 26,
			original: 'Barbarian',
			minOriginalLevel: 8,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 5
		},
		{
			name: 'Sneaky Goblin',
			id: 55,
			original: 'Goblin',
			minOriginalLevel: 7,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 3
		},
		{
			name: 'Super Giant',
			id: 29,
			original: 'Giant',
			minOriginalLevel: 9,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 10
		},
		{
			name: 'Super Wall Breaker',
			id: 28,
			original: 'Wall Breaker',
			minOriginalLevel: 7,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 8
		},
		{
			name: 'Super Archer',
			id: 27,
			original: 'Archer',
			minOriginalLevel: 8,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 12
		},
		{
			name: 'Super Witch',
			id: 66,
			original: 'Witch',
			minOriginalLevel: 5,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 40
		},
		{
			name: 'Inferno Dragon',
			id: 63,
			original: 'Baby Dragon',
			minOriginalLevel: 6,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 15
		},
		{
			name: 'Super Valkyrie',
			id: 64,
			original: 'Valkyrie',
			minOriginalLevel: 7,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 20
		},
		{
			name: 'Super Minion',
			id: 84,
			original: 'Minion',
			minOriginalLevel: 8,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 12
		},
		{
			name: 'Super Wizard',
			id: 83,
			original: 'Wizard',
			minOriginalLevel: 9,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 10
		},
		{
			name: 'Ice Hound',
			id: 76,
			original: 'Lava Hound',
			minOriginalLevel: 5,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 40
		},
		{
			name: 'Rocket Balloon',
			id: 57,
			original: 'Balloon',
			minOriginalLevel: 8,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 8
		},
		{
			name: 'Super Bowler',
			id: 80,
			original: 'Bowler',
			minOriginalLevel: 4,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 30
		},
		{
			name: 'Super Dragon',
			id: 81,
			original: 'Dragon',
			minOriginalLevel: 7,
			village: 'home',
			duration: 259200,
			cooldown: 259200,
			resource: 'Dark Elixir',
			resourceCost: 25000,
			housingSpace: 40
		}
	],
	TROOPS: [
		{
			id: 0,
			name: 'Barbarian',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 1,
				cost: 100,
				time: 10,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 1
			},
			upgrade: {
				cost: [20000, 60000, 200000, 650000, 1400000, 2500000, 4000000, 8000000, 15000000],
				time: [7200, 18000, 43200, 86400, 129600, 259200, 388800, 864000, 1209600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9, 10]
		},
		{
			id: 1,
			name: 'Archer',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 500,
				time: 60,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 2
			},
			upgrade: {
				cost: [30000, 80000, 300000, 800000, 2000000, 3000000, 4500000, 9000000, 15500000],
				time: [10800, 21600, 43200, 86400, 129600, 259200, 432000, 907200, 1209600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9, 10]
		},
		{
			id: 2,
			name: 'Goblin',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 5000,
				time: 3600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 4
			},
			upgrade: {
				cost: [45000, 175000, 500000, 1200000, 2000000, 3500000, 9000000],
				time: [18000, 32400, 43200, 86400, 129600, 345600, 1036800],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8]
		},
		{
			id: 3,
			name: 'Giant',
			housingSpace: 5,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 2500,
				time: 600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 3
			},
			upgrade: {
				cost: [40000, 150000, 500000, 1200000, 2000000, 3500000, 5000000, 9000000, 13000000],
				time: [14400, 28800, 43200, 86400, 172800, 345600, 691200, 1123200, 1296000],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			id: 4,
			name: 'Wall Breaker',
			housingSpace: 2,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 3,
				cost: 10000,
				time: 14400,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 5
			},
			upgrade: {
				cost: [100000, 250000, 600000, 1200000, 3000000, 6000000, 10500000, 13000000, 16000000],
				time: [21600, 43200, 64800, 86400, 216000, 432000, 864000, 1252800, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10]
		},
		{
			id: 5,
			name: 'Balloon',
			housingSpace: 5,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 4,
				cost: 75000,
				time: 28800,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 6
			},
			upgrade: {
				cost: [125000, 400000, 800000, 1500000, 2750000, 6500000, 11000000, 14000000, 18000000],
				time: [28800, 43200, 64800, 86400, 302400, 648000, 1166400, 1382400, 1555200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 2, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10]
		},
		{
			id: 6,
			name: 'Wizard',
			housingSpace: 4,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 200000,
				time: 43200,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [120000, 320000, 620000, 1200000, 2200000, 4200000, 7200000, 9200000, 14200000],
				time: [28800, 43200, 64800, 86400, 172800, 345600, 648000, 1080000, 1252800],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			id: 7,
			name: 'Healer',
			housingSpace: 14,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 6,
				cost: 600000,
				time: 57600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 8
			},
			upgrade: {
				cost: [450000, 900000, 2700000, 6000000, 13000000, 17000000],
				time: [43200, 86400, 172800, 864000, 1209600, 1468800],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 5, 5, 6, 7]
		},
		{
			id: 8,
			name: 'Dragon',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 7,
				cost: 900000,
				time: 86400,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 9
			},
			upgrade: {
				cost: [1000000, 2000000, 3000000, 4500000, 7000000, 10000000, 15000000, 18500000],
				time: [64800, 129600, 259200, 518400, 691200, 1209600, 1382400, 1555200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9]
		},
		{
			id: 9,
			name: 'P.E.K.K.A',
			housingSpace: 25,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 8,
				cost: 1200000,
				time: 129600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 10
			},
			upgrade: {
				cost: [1200000, 1800000, 2800000, 3800000, 5000000, 7500000, 11000000, 14000000],
				time: [43200, 86400, 172800, 345600, 475200, 734400, 1209600, 1296000],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 3, 4, 6, 7, 8, 9, 9]
		},
		{
			id: 10,
			name: 'Minion',
			housingSpace: 2,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 7,
				cost: 100000,
				time: 14400,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 1
			},
			upgrade: {
				cost: [3000, 7000, 15000, 25000, 40000, 90000, 150000, 250000, 300000],
				time: [28800, 57600, 86400, 172800, 345600, 604800, 1209600, 1339200, 1425600],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8, 9, 10]
		},
		{
			id: 11,
			name: 'Hog Rider',
			housingSpace: 5,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 7,
				cost: 300000,
				time: 43200,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 2
			},
			upgrade: {
				cost: [5000, 9000, 16000, 30000, 50000, 100000, 150000, 240000, 280000, 320000],
				time: [36000, 72000, 108000, 172800, 345600, 648000, 993600, 1209600, 1382400, 1468800],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 9, 10, 11]
		},
		{
			id: 12,
			name: 'Valkyrie',
			housingSpace: 8,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 8,
				cost: 500000,
				time: 64800,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 3
			},
			upgrade: {
				cost: [8000, 12000, 25000, 45000, 90000, 175000, 260000, 310000],
				time: [86400, 172800, 259200, 432000, 648000, 950400, 1382400, 1468800],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8, 9]
		},
		{
			id: 13,
			name: 'Golem',
			housingSpace: 30,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 8,
				cost: 900000,
				time: 86400,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 4
			},
			upgrade: {
				cost: [10000, 20000, 30000, 50000, 75000, 110000, 160000, 200000, 270000, 320000],
				time: [108000, 216000, 324000, 432000, 604800, 691200, 907200, 1209600, 1382400, 1468800],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 7, 9, 10, 11]
		},
		{
			id: 15,
			name: 'Witch',
			housingSpace: 12,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 9,
				cost: 1500000,
				time: 172800,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 5
			},
			upgrade: {
				cost: [50000, 80000, 130000, 200000],
				time: [345600, 475200, 820800, 1209600],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5]
		},
		{
			id: 17,
			name: 'Lava Hound',
			housingSpace: 30,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 9,
				cost: 2200000,
				time: 259200,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 6
			},
			upgrade: {
				cost: [35000, 60000, 120000, 190000, 270000],
				time: [216000, 432000, 777600, 1209600, 1382400],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 6]
		},
		{
			id: 22,
			name: 'Bowler',
			housingSpace: 6,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 10,
				cost: 3000000,
				time: 432000,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [75000, 125000, 200000, 280000, 320000],
				time: [345600, 604800, 1036800, 1252800, 1512000],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6]
		},
		{
			id: 23,
			name: 'Baby Dragon',
			housingSpace: 10,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 9,
				cost: 1800000,
				time: 216000,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 11
			},
			upgrade: {
				cost: [2000000, 3000000, 4000000, 6000000, 9000000, 12000000, 17000000],
				time: [172800, 345600, 518400, 777600, 1036800, 1209600, 1425600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8]
		},
		{
			id: 24,
			name: 'Miner',
			housingSpace: 6,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 10,
				cost: 2500000,
				time: 345600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 12
			},
			upgrade: {
				cost: [3000000, 4000000, 5000000, 7000000, 9500000, 13000000, 17500000],
				time: [216000, 345600, 518400, 864000, 1123200, 1339200, 1468800],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 7, 8]
		},
		{
			id: 30,
			name: 'Ice Wizard',
			housingSpace: 4,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 200000,
				time: 43200,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [150000, 450000, 1350000, 2500000, 5000000, 7000000, 9000000, 11000000, 15000000],
				time: [43200, 129600, 172800, 259200, 432000, 518400, 864000, 1209600, 1296000],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			id: 31,
			name: 'Raged Barbarian',
			housingSpace: 2,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 1,
				cost: 1000,
				time: 0,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					3500, 6000, 9000, 50000, 100000, 300000, 330000, 700000, 900000, 1000000, 1200000, 2000000, 2200000, 3000000, 3200000,
					3800000, 4000000
				],
				time: [300, 900, 10800, 21600, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000, 432000],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [2, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 32,
			name: 'Sneaky Archer',
			housingSpace: 2,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 4000,
				time: 60,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 2
			},
			upgrade: {
				cost: [
					5000, 8000, 12000, 60000, 120000, 320000, 350000, 800000, 1000000, 1100000, 1300000, 2100000, 2300000, 3100000, 3300000,
					3900000, 4100000
				],
				time: [
					180, 600, 1800, 14400, 21600, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000, 432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 33,
			name: 'Beta Minion',
			housingSpace: 2,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 3,
				cost: 25000,
				time: 1800,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 4
			},
			upgrade: {
				cost: [
					50000, 80000, 120000, 250000, 280000, 320000, 360000, 900000, 1100000, 1300000, 1500000, 2300000, 2500000, 3300000,
					3500000, 4000000, 4200000
				],
				time: [
					3600, 10800, 18000, 28800, 43200, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000,
					432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 34,
			name: 'Boxer Giant',
			housingSpace: 8,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 3,
				cost: 10000,
				time: 600,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 3
			},
			upgrade: {
				cost: [
					20000, 40000, 60000, 300000, 320000, 340000, 380000, 1000000, 1200000, 1300000, 1500000, 2300000, 2500000, 3300000,
					3500000, 4000000, 4200000
				],
				time: [
					1800, 3600, 7200, 28800, 43200, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000,
					432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 35,
			name: 'Bomber',
			housingSpace: 4,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 4,
				cost: 100000,
				time: 10800,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 5
			},
			upgrade: {
				cost: [
					150000, 200000, 250000, 280000, 320000, 340000, 360000, 900000, 1000000, 1200000, 1400000, 2200000, 2400000, 3200000,
					3400000, 3900000, 4100000
				],
				time: [
					10800, 18000, 28800, 43200, 43200, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000,
					432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 36,
			name: 'Super P.E.K.K.A',
			housingSpace: 25,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 8,
				cost: 1500000,
				time: 86400,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 10
			},
			upgrade: {
				cost: [
					1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000,
					3800000, 4000000, 4600000, 4800000
				],
				time: [
					86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 345600, 345600, 345600, 345600, 345600, 345600, 345600,
					432000, 432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 16, 18]
		},
		{
			id: 37,
			name: 'Cannon Cart',
			housingSpace: 8,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 300000,
				time: 28800,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [
					400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000,
					3600000, 4100000, 4300000
				],
				time: [
					43200, 43200, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000,
					432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 10, 12, 14, 16, 18]
		},
		{
			id: 38,
			name: 'Drop Ship',
			housingSpace: 5,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 7,
				cost: 1000000,
				time: 43200,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 9
			},
			upgrade: {
				cost: [
					1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 2000000, 2200000, 2400000, 2600000, 2800000,
					3600000, 3800000, 4300000, 4500000
				],
				time: [
					43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 259200, 259200, 259200, 259200, 259200, 345600, 345600,
					432000, 432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 14, 16, 18]
		},
		{
			id: 41,
			name: 'Baby Dragon',
			housingSpace: 10,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 4,
				cost: 150000,
				time: 21600,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 6
			},
			upgrade: {
				cost: [
					200000, 240000, 280000, 320000, 360000, 380000, 400000, 1000000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000,
					3600000, 4100000, 4300000
				],
				time: [
					18000, 28800, 43200, 43200, 43200, 43200, 43200, 86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 432000,
					432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			id: 42,
			name: 'Night Witch',
			housingSpace: 12,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 6,
				cost: 500000,
				time: 36000,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 8
			},
			upgrade: {
				cost: [
					600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000, 1400000, 1600000, 1800000, 2500000, 2700000,
					3500000, 3700000, 4200000, 4400000
				],
				time: [
					43200, 43200, 86400, 86400, 172800, 172800, 172800, 172800, 172800, 172800, 172800, 259200, 259200, 345600, 345600,
					432000, 432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 12, 14, 16, 18]
		},
		{
			id: 45,
			name: 'Battle Ram',
			housingSpace: 4,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 2500,
				time: 600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 3
			},
			upgrade: {
				cost: [100000],
				time: [86400],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			id: 47,
			name: 'Royal Ghost',
			housingSpace: 8,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 200000,
				time: 43200,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [5000],
				time: [86400],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 7, 7]
		},
		{
			id: 48,
			name: 'Pumpkin Barbarian',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 1,
				cost: 100,
				time: 10,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 1
			},
			upgrade: {
				cost: [50000, 150000, 500000, 1500000, 4500000, 6000000],
				time: [21600, 86400, 259200, 432000, 864000, 1209600],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 7, 7, 7, 7]
		},
		{
			id: 50,
			name: 'Giant Skeleton',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 2,
				cost: 2500,
				time: 600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 3
			},
			upgrade: {
				cost: [100000, 250000, 750000, 2250000, 5000000, 6000000, 9500000],
				time: [86400, 172800, 259200, 432000, 864000, 1036800, 1209600],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8]
		},
		{
			id: 51,
			name: 'Wall Wrecker',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 12,
				cost: 5000000,
				time: 518400,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 1
			},
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [691200, 864000, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			id: 52,
			name: 'Battle Blimp',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 12,
				cost: 8000000,
				time: 691200,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 2
			},
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [691200, 864000, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			id: 53,
			name: 'Yeti',
			housingSpace: 18,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 12,
				cost: 5000000,
				time: 777600,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 14
			},
			upgrade: {
				cost: [11000000, 15000000, 18000000],
				time: [950400, 1382400, 1555200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4]
		},
		{
			id: 58,
			name: 'Ice Golem',
			housingSpace: 15,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 11,
				cost: 4000000,
				time: 777600,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 8
			},
			upgrade: {
				cost: [80000, 120000, 160000, 200000, 320000],
				time: [345600, 604800, 907200, 1209600, 1468800],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5, 6]
		},
		{
			id: 59,
			name: 'Electro Dragon',
			housingSpace: 30,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 11,
				cost: 4000000,
				time: 518400,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 13
			},
			upgrade: {
				cost: [9000000, 11000000, 16000000, 19000000],
				time: [691200, 1209600, 1382400, 1555200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5]
		},
		{
			id: 61,
			name: 'Skeleton Barrel',
			housingSpace: 5,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 4,
				cost: 75000,
				time: 28800,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 6
			},
			upgrade: {
				cost: [150000, 450000, 1350000, 2500000, 6000000, 9500000, 12000000, 12000000],
				time: [43200, 129600, 172800, 302400, 561600, 993600, 1209600, 1209600],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 2, 2, 3, 4, 5, 6, 6, 7, 8, 9, 9]
		},
		{
			id: 62,
			name: 'Stone Slammer',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 12,
				cost: 10500000,
				time: 864000,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 3
			},
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [691200, 864000, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 4]
		},
		{
			id: 65,
			name: 'Dragon Rider',
			housingSpace: 25,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 13,
				cost: 6000000,
				time: 950400,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 15
			},
			upgrade: {
				cost: [16000000, 17500000],
				time: [1296000, 1468800],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]
		},
		{
			id: 67,
			name: 'El Primo',
			housingSpace: 10,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 200000,
				time: 43200,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [120000],
				time: [734400],
				resource: 'Dark Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			id: 70,
			name: 'Hog Glider',
			housingSpace: 5,
			village: 'builderBase',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 9,
				cost: 2000000,
				time: 129600,
				resource: 'Builder Elixir',
				building: 'Builder Barracks',
				buildingLevel: 11
			},
			upgrade: {
				cost: [
					1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000,
					3800000, 4000000, 4200000, 4400000
				],
				time: [
					86400, 86400, 172800, 172800, 259200, 259200, 345600, 345600, 345600, 345600, 345600, 345600, 345600, 345600, 345600,
					432000, 432000
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 18]
		},
		{
			id: 72,
			name: 'Party Wizard',
			housingSpace: 4,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 5,
				cost: 200000,
				time: 43200,
				resource: 'Elixir',
				building: 'Barracks',
				buildingLevel: 7
			},
			upgrade: {
				cost: [],
				time: [],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]
		},
		{
			id: 75,
			name: 'Siege Barracks',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 13,
				cost: 14500000,
				time: 1209600,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 4
			},
			upgrade: {
				cost: [8000000, 11000000, 14000000],
				time: [864000, 1209600, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4]
		},
		{
			id: 82,
			name: 'Headhunter',
			housingSpace: 6,
			village: 'home',
			category: 'troop',
			subCategory: 'troop',
			unlock: {
				hall: 12,
				cost: 7500000,
				time: 1123200,
				resource: 'Elixir',
				building: 'Dark Barracks',
				buildingLevel: 9
			},
			upgrade: {
				cost: [180000, 240000],
				time: [1209600, 1382400],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3]
		},
		{
			id: 87,
			name: 'Log Launcher',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 13,
				cost: 16000000,
				time: 1382400,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 5
			},
			upgrade: {
				cost: [8000000, 11000000, 14000000],
				time: [864000, 1209600, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4]
		},
		{
			id: 91,
			name: 'Flame Flinger',
			housingSpace: 1,
			village: 'home',
			category: 'troop',
			subCategory: 'siege',
			unlock: {
				hall: 14,
				cost: 17500000,
				time: 1555200,
				resource: 'Elixir',
				building: 'Workshop',
				buildingLevel: 6
			},
			upgrade: {
				cost: [8000000, 11000000, 14000000],
				time: [864000, 1209600, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]
		},
		{
			id: 0,
			name: 'Lightning Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 5,
				cost: 150000,
				time: 28800,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 1
			},
			upgrade: {
				cost: [50000, 100000, 200000, 600000, 1500000, 3000000, 6000000, 10000000],
				time: [14400, 28800, 43200, 86400, 345600, 604800, 907200, 1123200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 4, 4, 4, 5, 6, 7, 8, 9, 9, 9]
		},
		{
			id: 1,
			name: 'Healing Spell',
			housingSpace: 2,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 6,
				cost: 300000,
				time: 86400,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 2
			},
			upgrade: {
				cost: [75000, 150000, 300000, 900000, 1800000, 3600000, 14000000],
				time: [18000, 36000, 72000, 129600, 345600, 604800, 1382400],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 3, 4, 5, 6, 7, 7, 7, 8, 8]
		},
		{
			id: 2,
			name: 'Rage Spell',
			housingSpace: 2,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 7,
				cost: 600000,
				time: 172800,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 3
			},
			upgrade: {
				cost: [400000, 800000, 1600000, 2400000, 11000000],
				time: [43200, 86400, 172800, 345600, 993600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 6, 6, 6]
		},
		{
			id: 3,
			name: 'Jump Spell',
			housingSpace: 2,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 9,
				cost: 1200000,
				time: 302400,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 4
			},
			upgrade: {
				cost: [2000000, 4000000, 12000000],
				time: [345600, 604800, 1296000],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 4, 4]
		},
		{
			id: 5,
			name: 'Freeze Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 9,
				cost: 1200000,
				time: 302400,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 4
			},
			upgrade: {
				cost: [1200000, 2000000, 3600000, 5000000, 8500000, 11000000],
				time: [129600, 259200, 432000, 648000, 777600, 993600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 6, 7, 7, 7]
		},
		{
			id: 4,
			name: "Santa's Surprise",
			housingSpace: 2,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 5,
				cost: 150000,
				time: 28800,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 1
			},
			upgrade: {
				cost: [],
				time: [],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			id: 9,
			name: 'Poison Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 8,
				cost: 150000,
				time: 21600,
				resource: 'Elixir',
				building: 'Dark Spell Factory',
				buildingLevel: 1
			},
			upgrade: {
				cost: [12000, 25000, 50000, 100000, 175000, 260000, 300000],
				time: [28800, 86400, 259200, 777600, 950400, 1339200, 1512000],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8]
		},
		{
			id: 10,
			name: 'Earthquake Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 8,
				cost: 300000,
				time: 64800,
				resource: 'Elixir',
				building: 'Dark Spell Factory',
				buildingLevel: 2
			},
			upgrade: {
				cost: [15000, 30000, 60000, 120000],
				time: [64800, 129600, 432000, 950400],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5, 5]
		},
		{
			id: 11,
			name: 'Haste Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 9,
				cost: 600000,
				time: 172800,
				resource: 'Elixir',
				building: 'Dark Spell Factory',
				buildingLevel: 3
			},
			upgrade: {
				cost: [20000, 40000, 70000, 110000],
				time: [129600, 259200, 518400, 950400],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 5, 5, 5]
		},
		{
			id: 16,
			name: 'Clone Spell',
			housingSpace: 3,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 10,
				cost: 2400000,
				time: 432000,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 5
			},
			upgrade: {
				cost: [2500000, 4000000, 6000000, 8000000, 12000000, 16500000],
				time: [172800, 345600, 475200, 864000, 1296000, 1425600],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5, 6, 7]
		},
		{
			id: 17,
			name: 'Skeleton Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 9,
				cost: 1200000,
				time: 345600,
				resource: 'Elixir',
				building: 'Dark Spell Factory',
				buildingLevel: 4
			},
			upgrade: {
				cost: [25000, 40000, 70000, 125000, 150000, 250000],
				time: [129600, 259200, 518400, 734400, 907200, 1296000],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 6, 7, 7]
		},
		{
			id: 22,
			name: 'Birthday Boom',
			housingSpace: 2,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 5,
				cost: 150000,
				time: 28800,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 1
			},
			upgrade: {
				cost: [],
				time: [],
				resource: 'Elixir'
			},
			seasonal: true,
			levels: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			id: 28,
			name: 'Bat Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 10,
				cost: 2500000,
				time: 518400,
				resource: 'Elixir',
				building: 'Dark Spell Factory',
				buildingLevel: 5
			},
			upgrade: {
				cost: [30000, 60000, 100000, 150000],
				time: [172800, 345600, 648000, 777600],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5, 5, 5]
		},
		{
			id: 35,
			name: 'Invisibility Spell',
			housingSpace: 1,
			village: 'home',
			category: 'spell',
			subCategory: 'spell',
			unlock: {
				hall: 11,
				cost: 4800000,
				time: 604800,
				resource: 'Elixir',
				building: 'Spell Factory',
				buildingLevel: 6
			},
			upgrade: {
				cost: [8000000, 12000000, 15000000],
				time: [691200, 993600, 1339200],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 4]
		},
		{
			id: 0,
			name: 'Barbarian King',
			housingSpace: 25,
			village: 'home',
			category: 'hero',
			subCategory: 'hero',
			unlock: {
				hall: 7,
				cost: 5000,
				time: 0,
				resource: 'Dark Elixir',
				building: 'Town Hall',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					6000, 7000, 8000, 10000, 11000, 12000, 13000, 14000, 15000, 17000, 19000, 21000, 23000, 25000, 27000, 29000, 31000,
					33000, 35000, 37000, 39000, 41000, 43000, 45000, 47000, 49000, 51000, 53000, 55000, 57000, 59000, 61000, 63000, 65000,
					68000, 71000, 74000, 77000, 80000, 86000, 92000, 98000, 104000, 110000, 116000, 122000, 128000, 134000, 140000, 146000,
					152000, 158000, 164000, 170000, 178000, 186000, 194000, 202000, 210000, 217000, 224000, 230000, 235000, 240000, 250000,
					260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000, 305000, 310000, 315000, 320000, 325000
				],
				time: [
					14400, 21600, 28800, 36000, 43200, 50400, 57600, 64800, 72000, 79200, 86400, 115200, 144000, 172800, 172800, 172800,
					172800, 172800, 216000, 216000, 216000, 216000, 216000, 259200, 259200, 259200, 259200, 259200, 345600, 345600, 345600,
					345600, 345600, 432000, 432000, 432000, 432000, 432000, 518400, 518400, 518400, 518400, 518400, 561600, 561600, 561600,
					561600, 561600, 561600, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800,
					604800, 604800, 604800, 648000, 648000, 648000, 648000, 691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200,
					691200, 691200, 691200
				],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 5, 10, 30, 40, 50, 65, 75, 80]
		},
		{
			id: 1,
			name: 'Archer Queen',
			housingSpace: 25,
			village: 'home',
			category: 'hero',
			subCategory: 'hero',
			unlock: {
				hall: 9,
				cost: 10000,
				time: 0,
				resource: 'Dark Elixir',
				building: 'Town Hall',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					11000, 12000, 13000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000,
					38000, 40000, 42000, 44000, 46000, 48000, 50000, 52000, 54000, 56000, 58000, 60000, 63000, 66000, 69000, 72000, 75000,
					78000, 81000, 84000, 87000, 90000, 96000, 102000, 108000, 114000, 120000, 126000, 132000, 138000, 144000, 150000,
					156000, 162000, 168000, 174000, 180000, 187000, 194000, 201000, 208000, 215000, 220000, 225000, 230000, 235000, 240000,
					250000, 260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000, 306000, 312000, 318000, 324000, 330000
				],
				time: [
					14400, 21600, 28800, 36000, 43200, 50400, 57600, 64800, 72000, 79200, 86400, 115200, 144000, 172800, 172800, 172800,
					172800, 172800, 216000, 216000, 216000, 216000, 216000, 259200, 259200, 259200, 259200, 259200, 345600, 345600, 345600,
					345600, 345600, 432000, 432000, 432000, 432000, 432000, 518400, 518400, 518400, 518400, 518400, 561600, 561600, 561600,
					561600, 561600, 561600, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800,
					604800, 604800, 604800, 648000, 648000, 648000, 648000, 691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200,
					691200, 691200, 691200
				],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 50, 65, 75, 80]
		},
		{
			id: 2,
			name: 'Grand Warden',
			housingSpace: 25,
			village: 'home',
			category: 'hero',
			subCategory: 'hero',
			unlock: {
				hall: 11,
				cost: 1000000,
				time: 0,
				resource: 'Elixir',
				building: 'Town Hall',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000,
					6000000, 6500000, 7000000, 7500000, 8000000, 9000000, 10000000, 10100000, 10200000, 10300000, 10400000, 10500000,
					10600000, 10700000, 10800000, 10900000, 11000000, 11100000, 11200000, 11300000, 11400000, 11500000, 11600000, 11700000,
					11800000, 11900000, 12000000, 12500000, 13000000, 13500000, 14000000, 14500000, 15000000, 15500000, 16000000, 16500000,
					17000000, 17500000, 18000000, 18500000, 19000000
				],
				time: [
					7200, 14400, 28800, 43200, 64800, 86400, 108000, 129600, 172800, 216000, 259200, 345600, 432000, 518400, 604800, 604800,
					604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800,
					604800, 604800, 604800, 604800, 604800, 604800, 604800, 604800, 648000, 648000, 648000, 648000, 648000, 691200, 691200,
					691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200
				],
				resource: 'Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 40, 50, 55]
		},
		{
			id: 3,
			name: 'Battle Machine',
			housingSpace: 25,
			village: 'builderBase',
			category: 'hero',
			subCategory: 'hero',
			unlock: {
				hall: 5,
				cost: 900000,
				time: 43200,
				resource: 'Builder Elixir',
				building: 'Builder Hall',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					1000000, 1100000, 1200000, 1300000, 1500000, 1600000, 1700000, 1800000, 1900000, 2100000, 2200000, 2300000, 2400000,
					2500000, 2600000, 2700000, 2800000, 2900000, 3000000, 3100000, 3200000, 3300000, 3400000, 3500000, 3600000, 3700000,
					3800000, 3900000, 4000000, 4000000
				],
				time: [
					43200, 43200, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 172800, 172800, 172800, 172800, 172800, 259200, 259200,
					259200, 259200, 259200, 259200, 259200, 259200, 259200, 259200, 345600, 345600, 345600, 345600, 345600, 345600
				],
				resource: 'Builder Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 5, 10, 20, 25, 30]
		},
		{
			id: 4,
			name: 'Royal Champion',
			housingSpace: 25,
			village: 'home',
			category: 'hero',
			subCategory: 'hero',
			unlock: {
				hall: 13,
				cost: 60000,
				time: 0,
				resource: 'Dark Elixir',
				building: 'Town Hall',
				buildingLevel: 1
			},
			upgrade: {
				cost: [
					80000, 100000, 120000, 140000, 160000, 180000, 190000, 200000, 210000, 220000, 230000, 235000, 240000, 245000, 250000,
					255000, 260000, 265000, 270000, 275000, 280000, 285000, 290000, 295000, 300000, 305000, 310000, 315000, 320000
				],
				time: [
					28800, 57600, 86400, 172800, 259200, 302400, 345600, 388800, 432000, 475200, 518400, 561600, 604800, 604800, 648000,
					648000, 648000, 648000, 648000, 691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200, 691200
				],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 30]
		},
		{
			id: 0,
			name: 'L.A.S.S.I',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'pet',
			unlock: {
				hall: 14,
				cost: 15000000,
				time: 1123200,
				resource: 'Elixir',
				building: 'Pet House',
				buildingLevel: 1
			},
			upgrade: {
				cost: [115000, 130000, 145000, 160000, 175000, 190000, 205000, 220000, 235000],
				time: [259200, 345600, 432000, 475200, 518400, 561600, 604800, 648000, 691200],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			id: 1,
			name: 'Mighty Yak',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'pet',
			unlock: {
				hall: 14,
				cost: 18500000,
				time: 1468800,
				resource: 'Elixir',
				building: 'Pet House',
				buildingLevel: 3
			},
			upgrade: {
				cost: [165000, 185000, 205000, 225000, 245000, 255000, 265000, 275000, 285000],
				time: [259200, 345600, 432000, 475200, 518400, 561600, 604800, 648000, 691200],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			id: 2,
			name: 'Electro Owl',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'pet',
			unlock: {
				hall: 14,
				cost: 17500000,
				time: 1296000,
				resource: 'Elixir',
				building: 'Pet House',
				buildingLevel: 2
			},
			upgrade: {
				cost: [135000, 150000, 165000, 180000, 195000, 210000, 225000, 240000, 255000],
				time: [259200, 345600, 432000, 475200, 518400, 561600, 604800, 648000, 691200],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		},
		{
			id: 3,
			name: 'Unicorn',
			housingSpace: 20,
			village: 'home',
			category: 'troop',
			subCategory: 'pet',
			unlock: {
				hall: 14,
				cost: 19500000,
				time: 1641600,
				resource: 'Elixir',
				building: 'Pet House',
				buildingLevel: 4
			},
			upgrade: {
				cost: [210000, 220000, 230000, 240000, 250000, 260000, 270000, 280000, 290000],
				time: [259200, 345600, 432000, 475200, 518400, 561600, 604800, 648000, 691200],
				resource: 'Dark Elixir'
			},
			seasonal: false,
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]
		}
	],
	TROOPS_HOUSING: [
		{
			hall: 1,
			troops: 20,
			spells: 0
		},
		{
			hall: 2,
			troops: 30,
			spells: 0
		},
		{
			hall: 3,
			troops: 70,
			spells: 0
		},
		{
			hall: 4,
			troops: 80,
			spells: 0
		},
		{
			hall: 5,
			troops: 135,
			spells: 2
		},
		{
			hall: 6,
			troops: 150,
			spells: 4
		},
		{
			hall: 7,
			troops: 200,
			spells: 6
		},
		{
			hall: 8,
			troops: 200,
			spells: 7
		},
		{
			hall: 9,
			troops: 220,
			spells: 9
		},
		{
			hall: 10,
			troops: 240,
			spells: 11
		},
		{
			hall: 11,
			troops: 260,
			spells: 11
		},
		{
			hall: 12,
			troops: 280,
			spells: 11
		},
		{
			hall: 13,
			troops: 300,
			spells: 11
		},
		{
			hall: 14,
			troops: 300,
			spells: 11
		}
	]
};