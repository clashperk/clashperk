import Client from '../struct/Client';

export class RoleManager {
	private readonly queues: string[];

	public constructor(private readonly client: Client) {
		this.queues = [];
	}

	public init() {
		this.queues.shift();
	}
}
