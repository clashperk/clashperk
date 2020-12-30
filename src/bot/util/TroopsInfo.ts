export default {
	SUPER_TROOPS: [
		{
			name: 'Super Barbarian',
			original: 'Barbarian',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Sneaky Goblin',
			original: 'Goblin',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Giant',
			original: 'Giant',
			minOriginalLevel: 9,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Wall Breaker',
			original: 'Wall Breaker',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Archer',
			original: 'Archer',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Witch',
			original: 'Witch',
			minOriginalLevel: 5,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Inferno Dragon',
			original: 'Baby Dragon',
			minOriginalLevel: 6,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Valkyrie',
			original: 'Valkyrie',
			minOriginalLevel: 7,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Minion',
			original: 'Minion',
			minOriginalLevel: 8,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Super Wizard',
			original: 'Wizard',
			minOriginalLevel: 9,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		},
		{
			name: 'Ice Hound',
			original: 'Lava Hound',
			minOriginalLevel: 5,
			village: 'home',
			duration: 72,
			cooldown: 72,
			resource: 'Dark Elixir',
			resourceCost: 25000
		}
	],
	TROOPS: [
		{
			name: 'Barbarian King',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				cost: [12000, 14000, 16000, 18000, 20000, 22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000, 38000, 40000, 42000, 44000, 46000, 48000, 50000, 53000, 56000, 59000, 62000, 65000, 68000, 72000, 76000, 80000, 88000, 96000, 104000, 112000, 120000, 128000, 136000, 144000, 152000, 160000, 170000, 173000, 176000, 179000, 182000, 185000, 188000, 191000, 194000, 197000, 200000, 203000, 206000, 209000, 212000, 215000, 218000, 221000, 224000, 227000, 230000, 233000, 236000, 239000, 240000, 250000, 260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000],
				time: [12, 12, 24, 24, 24, 36, 36, 36, 48, 48, 48, 60, 60, 60, 72, 72, 72, 84, 84, 84, 96, 96, 96, 108, 108, 108, 120, 120, 120, 132, 132, 132, 144, 144, 144, 156, 156, 156, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 180, 180, 180, 180, 192, 192, 192, 192, 192, 192, 192],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 5, 10, 30, 40, 50, 65, 75]
		},
		{
			name: 'Archer Queen',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				cost: [22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000, 38000, 40000, 42000, 44000, 46000, 48000, 50000, 53000, 56000, 59000, 62000, 65000, 68000, 71000, 74000, 77000, 80000, 83000, 86000, 89000, 92000, 98000, 106000, 114000, 122000, 130000, 138000, 146000, 154000, 162000, 170000, 180000, 182000, 184000, 186000, 188000, 190000, 192000, 194000, 196000, 198000, 200000, 204000, 208000, 212000, 216000, 220000, 224000, 228000, 232000, 236000, 240000, 240000, 240000, 240000, 240000, 250000, 260000, 270000, 280000, 290000, 292000, 294000, 296000, 298000, 300000],
				time: [12, 12, 24, 24, 24, 36, 36, 36, 48, 48, 48, 60, 60, 60, 72, 72, 72, 84, 84, 84, 96, 96, 96, 108, 108, 108, 120, 120, 120, 132, 132, 132, 144, 144, 144, 156, 156, 156, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 180, 180, 180, 180, 192, 192, 192, 192, 192, 192, 192],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 30, 40, 50, 65, 75]
		},
		{
			name: 'Grand Warden',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				cost: [2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000, 7500000, 8000000, 8400000, 8800000, 9100000, 9400000, 9600000, 9800000, 10000000, 10000000, 10200000, 10400000, 10600000, 10800000, 11000000, 11200000, 11400000, 11600000, 11800000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12000000, 12500000, 13000000, 13500000, 14000000, 14500000, 15000000, 15500000, 16000000, 16500000, 17000000],
				time: [12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 168, 180, 180, 180, 180, 180, 192, 192, 192, 192, 192, 192],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 40, 50]
		},
		{
			name: 'Battle Machine',
			village: 'builderBase',
			productionBuilding: 'Builder Hall',
			type: 'hero',
			upgrade: {
				cost: [1000000, 1100000, 1200000, 1300000, 1500000, 1600000, 1700000, 1800000, 1900000, 2100000, 2200000, 2300000, 2400000, 2500000, 2600000, 2700000, 2800000, 2900000, 3000000, 3100000, 3200000, 3300000, 3400000, 3500000, 3600000, 3700000, 3800000, 3900000, 4000000, 4000000],
				time: [12, 12, 24, 24, 24, 24, 24, 24, 24, 48, 48, 48, 48, 48, 72, 72, 72, 72, 72, 72, 72, 72, 72, 72, 96, 96, 96, 96, 96, 96],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 5, 10, 20, 25, 30]
		},
		{
			name: 'Royal Champion',
			village: 'home',
			productionBuilding: 'Town Hall',
			type: 'hero',
			upgrade: {
				cost: [130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000, 210000, 220000, 230000, 235000, 240000, 245000, 250000, 255000, 260000, 265000, 270000, 275000, 280000, 285000, 290000, 295000, 300000],
				time: [24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 168, 180, 180, 180, 180, 180, 192, 192, 192, 192, 192, 192],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25]
		},
		{
			name: 'Lightning Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [200000, 500000, 1000000, 2000000, 4000000, 6000000, 8000000, 10000000],
				time: [24, 48, 72, 96, 144, 216, 264, 312],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 4, 4, 4, 5, 6, 7, 8, 9, 9]
		},
		{
			name: 'Healing Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [300000, 600000, 1200000, 2000000, 4000000, 6000000, 14000000],
				time: [24, 48, 72, 96, 144, 240, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 3, 4, 5, 6, 7, 7, 7, 8]
		},
		{
			name: 'Rage Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [450000, 900000, 1800000, 3000000, 11000000],
				time: [48, 72, 96, 120, 276],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 6, 6]
		},
		{
			name: 'Jump Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [3000000, 6000000, 13000000],
				time: [96, 168, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 4]
		},
		{
			name: 'Freeze Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [3000000, 4000000, 5000000, 6000000, 9500000, 11000000],
				time: [72, 108, 156, 192, 216, 276],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 6, 7, 7]
		},
		{
			name: 'Poison Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				cost: [25000, 50000, 75000, 150000, 200000, 260000],
				time: [60, 96, 156, 228, 264, 372],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7]
		},
		{
			name: 'Earthquake Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				cost: [30000, 60000, 90000, 120000],
				time: [96, 120, 228, 264],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5]
		},
		{
			name: 'Haste Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				cost: [40000, 80000, 100000, 120000],
				time: [120, 156, 216, 264],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 5, 5]
		},
		{
			name: 'Clone Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [4000000, 6000000, 8000000, 10000000, 14000000],
				time: [96, 120, 156, 276, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5, 6]
		},
		{
			name: 'Skeleton Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				cost: [40000, 60000, 100000, 125000, 150000, 250000],
				time: [120, 156, 192, 216, 264, 360],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 6, 7]
		},
		{
			name: 'Bat Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Dark Spell Factory',
			upgrade: {
				cost: [60000, 80000, 120000, 160000],
				time: [120, 156, 192, 216],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5, 5]
		},
		{
			name: 'Invisibility Spell',
			village: 'home',
			type: 'spell',
			productionBuilding: 'Spell Factory',
			upgrade: {
				cost: [9000000, 12000000, 15000000],
				time: [216, 276, 372],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4]
		},
		{
			name: 'Barbarian',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 150000, 500000, 1250000, 2750000, 4500000, 7000000, 11000000],
				time: [6, 24, 48, 72, 96, 120, 192, 288],
				resource: 'Elixir'
			},
			levels: [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9]
		},
		{
			name: 'Archer',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 250000, 750000, 1500000, 3250000, 5000000, 8000000, 11500000],
				time: [12, 24, 48, 72, 96, 120, 192, 288],
				resource: 'Elixir'
			},
			levels: [1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 9]
		},
		{
			name: 'Goblin',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 250000, 750000, 1500000, 3000000, 5500000, 10500000],
				time: [12, 36, 48, 72, 120, 168, 288],
				resource: 'Elixir'
			},
			levels: [0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 7, 8, 8]
		},
		{
			name: 'Giant',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [100000, 250000, 750000, 2000000, 3500000, 5500000, 8500000, 11500000, 15000000],
				time: [12, 36, 48, 72, 120, 144, 240, 336, 360],
				resource: 'Elixir'
			},
			levels: [1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		},
		{
			name: 'Wall Breaker',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [100000, 250000, 750000, 1750000, 5500000, 9000000, 12000000, 14000000],
				time: [12, 36, 48, 72, 120, 192, 336, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9]
		},
		{
			name: 'Balloon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [150000, 450000, 1350000, 2500000, 4500000, 9500000, 12000000, 14000000],
				time: [12, 36, 48, 72, 120, 240, 336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 2, 2, 3, 4, 5, 6, 6, 7, 8, 9]
		},
		{
			name: 'Wizard',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [150000, 450000, 1350000, 2250000, 4000000, 6000000, 9000000, 11000000, 15000000],
				time: [12, 36, 48, 72, 120, 144, 240, 336, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		},
		{
			name: 'Healer',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [750000, 1500000, 3000000, 9500000, 14500000],
				time: [48, 72, 120, 336, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 5, 5, 6]
		},
		{
			name: 'Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [2000000, 2750000, 4500000, 6500000, 9000000, 11000000, 15000000],
				time: [96, 120, 144, 168, 240, 336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8]
		},
		{
			name: 'P.E.K.K.A',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [2500000, 3000000, 4500000, 6000000, 7000000, 9500000, 12000000, 15500000],
				time: [96, 120, 144, 168, 192, 240, 336, 360],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 3, 4, 6, 7, 8, 9]
		},
		{
			name: 'Minion',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [10000, 15000, 20000, 30000, 40000, 90000, 180000, 250000],
				time: [48, 60, 72, 96, 120, 180, 336, 372],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8, 9]
		},
		{
			name: 'Hog Rider',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [15000, 20000, 25000, 35000, 50000, 100000, 180000, 240000, 280000],
				time: [60, 72, 84, 108, 132, 192, 288, 336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 9, 10]
		},
		{
			name: 'Valkyrie',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [25000, 30000, 35000, 60000, 110000, 190000, 260000],
				time: [84, 96, 108, 144, 204, 336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7, 8]
		},
		{
			name: 'Golem',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [30000, 35000, 40000, 70000, 100000, 120000, 180000, 220000, 270000],
				time: [84, 96, 108, 144, 180, 192, 288, 336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 7, 9, 10]
		},
		{
			name: 'Witch',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 80000, 130000, 200000],
				time: [120, 156, 228, 336],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5]
		},
		{
			name: 'Lava Hound',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 70000, 125000, 200000, 270000],
				time: [120, 156, 216, 336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6]
		},
		{
			name: 'Bowler',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [90000, 140000, 200000, 280000],
				time: [168, 240, 336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5]
		},
		{
			name: 'Baby Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [4000000, 5000000, 6000000, 8000000, 9000000, 15000000],
				time: [120, 144, 168, 240, 336, 372],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 6, 7]
		},
		{
			name: 'Miner',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [5500000, 6500000, 8000000, 9500000, 11000000, 14000000],
				time: [132, 156, 192, 276, 336, 372],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 6, 7]
		},
		{
			name: 'Raged Barbarian',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [3500, 6000, 9000, 50000, 100000, 300000, 330000, 700000, 900000, 1000000, 1200000, 2000000, 2200000, 3000000, 3200000, 3800000, 4000000],
				time: [0, 0, 0, 3, 6, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [2, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Sneaky Archer',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [5000, 8000, 12000, 60000, 120000, 320000, 350000, 800000, 1000000, 1100000, 1300000, 2100000, 2300000, 3100000, 3300000, 3900000, 4100000],
				time: [0, 0, 0, 4, 6, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 4, 6, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Beta Minion',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [50000, 80000, 120000, 250000, 280000, 320000, 360000, 900000, 1100000, 1300000, 1500000, 2300000, 2500000, 3300000, 3500000, 4000000, 4200000],
				time: [1, 3, 5, 8, 12, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Boxer Giant',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [20000, 40000, 60000, 300000, 320000, 340000, 380000, 1000000, 1200000, 1300000, 1500000, 2300000, 2500000, 3300000, 3500000, 4000000, 4200000],
				time: [0, 1, 2, 8, 12, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 4, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Bomber',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [150000, 200000, 250000, 280000, 320000, 340000, 360000, 900000, 1000000, 1200000, 1400000, 2200000, 2400000, 3200000, 3400000, 3900000, 4100000],
				time: [3, 5, 8, 12, 12, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Super P.E.K.K.A',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000, 3800000, 4000000, 4600000, 4800000],
				time: [24, 24, 48, 48, 72, 72, 96, 96, 96, 96, 96, 96, 96, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 16, 18]
		},
		{
			name: 'Cannon Cart',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000, 3600000, 4100000, 4300000],
				time: [12, 12, 24, 24, 24, 24, 24, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 10, 12, 14, 16, 18]
		},
		{
			name: 'Drop Ship',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 2000000, 2200000, 2400000, 2600000, 2800000, 3600000, 3800000, 4300000, 4500000],
				time: [12, 12, 24, 24, 48, 48, 72, 72, 72, 72, 72, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 14, 16, 18]
		},
		{
			name: 'Baby Dragon',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [200000, 240000, 280000, 320000, 360000, 380000, 400000, 1000000, 1200000, 1400000, 1600000, 2400000, 2600000, 3400000, 3600000, 4100000, 4300000],
				time: [5, 8, 12, 12, 12, 12, 12, 24, 24, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 8, 10, 12, 14, 16, 18]
		},
		{
			name: 'Night Witch',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000, 1400000, 1600000, 1800000, 2500000, 2700000, 3500000, 3700000, 4200000, 4400000],
				time: [12, 12, 24, 24, 48, 48, 48, 48, 48, 48, 48, 72, 72, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 12, 14, 16, 18]
		},
		{
			name: 'Wall Wrecker',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [192, 240, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4]
		},
		{
			name: 'Battle Blimp',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [192, 240, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4]
		},
		{
			name: 'Yeti',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [11000000, 15000000],
				time: [336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]
		},
		{
			name: 'Ice Golem',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [80000, 120000, 160000, 200000],
				time: [192, 240, 288, 336, 336],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 5]
		},
		{
			name: 'Electro Dragon',
			village: 'home',
			productionBuilding: 'Barracks',
			type: 'troop',
			upgrade: {
				cost: [9000000, 11000000, 16000000],
				time: [240, 336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4]
		},
		{
			name: 'Stone Slammer',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				cost: [6000000, 8000000, 14000000],
				time: [192, 240, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 4]
		},
		{
			name: 'Hog Glider',
			village: 'builderBase',
			productionBuilding: 'Builder Barracks',
			type: 'troop',
			upgrade: {
				cost: [1600000, 1700000, 1800000, 1900000, 2000000, 2200000, 2400000, 2600000, 2800000, 3000000, 3200000, 3400000, 3600000, 3800000, 4000000, 4200000, 4400000],
				time: [24, 24, 48, 48, 72, 72, 96, 96, 96, 96, 96, 96, 96, 96, 96, 120, 120],
				resource: 'Builder Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 18]
		},
		{
			name: 'Siege Barracks',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				cost: [8000000, 11000000, 14000000],
				time: [240, 336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]
		},
		{
			name: 'Headhunter',
			village: 'home',
			productionBuilding: 'Dark Barracks',
			type: 'troop',
			upgrade: {
				cost: [180000, 240000],
				time: [336, 384],
				resource: 'Dark Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3]
		},
		{
			name: 'Log Launcher',
			village: 'home',
			productionBuilding: 'Workshop',
			type: 'troop',
			upgrade: {
				cost: [8000000, 11000000, 14000000],
				time: [240, 336, 384],
				resource: 'Elixir'
			},
			levels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]
		}
	]
};
