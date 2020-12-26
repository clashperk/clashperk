class BitField {
	constructor(bits) {
		this.bitfield = this.constructor.resolve(bits);
	}

	has(bit) {
		if (Array.isArray(bit)) return bit.every(b => this.has(b));
		bit = this.constructor.resolve(bit);
		return (this.bitfield & bit) === bit;
	}

	missing(bits) {
		if (!Array.isArray(bits)) bits = new this.constructor(bits).toArray(false);
		return bits.filter(bit => !this.has(bit));
	}

	add(...bits) {
		let total = 0;
		for (const bit of bits) {
			total |= this.constructor.resolve(bit);
		}
		if (Object.isFrozen(this)) return new this.constructor(this.bitfield | total);
		this.bitfield |= total;
		return this;
	}

	remove(...bits) {
		let total = 0;
		for (const bit of bits) {
			total |= this.constructor.resolve(bit);
		}
		if (Object.isFrozen(this)) return new this.constructor(this.bitfield & ~total);
		this.bitfield &= ~total;
		return this;
	}

	serialize() {
		const serialized = {};
		for (const [flag, bit] of Object.entries(this.constructor.FLAGS)) serialized[flag] = this.has(bit);
		return serialized;
	}

	toArray() {
		return Object.keys(this.constructor.FLAGS).filter(bit => this.has(bit));
	}

	get bit() {
		return this.bitfield;
	}

	static resolve(bit = 0) {
		if (typeof bit === 'number' && bit >= 0) return bit;
		if (bit instanceof BitField) return bit.bitfield;
		if (Array.isArray(bit)) return bit.map(p => this.resolve(p)).reduce((pre, b) => pre | b, 0);
		if (typeof bit === 'string' && typeof this.FLAGS[bit] !== 'undefined') return this.FLAGS[bit];
		throw new RangeError('BITFIELD_INVALID');
	}
}

BitField.FLAGS = {
	DONATION_LOG: 1 << 0,
	CLAN_MEMBER_LOG: 1 << 1,
	LAST_ONLINE_LOG: 1 << 2,
	CLAN_EMBED_LOG: 1 << 3,
	CLAN_GAMES_LOG: 1 << 4,
	CLAN_WAR_LOG: 1 << 5
};

BitField.ALL = Object.values(BitField.FLAGS).reduce((pre, bit) => pre | bit, 0);

module.exports = BitField;
