interface UserInfo {
	user_id: string; // unique: true
	user_tag?: string;
	clan?: {
		tag: string; // indexed
		name?: string;
	};
	entries: {
		tag: string; // unique: true, sparse: true
		name?: string;
		verified: boolean; // indexed
		unknown: boolean;
		townhall?: number;
	}[];
	timezone?: {
		id: string; // indexed
		name: string; // indexed
		offset: number;
	};
}
