import { inject, injectable } from 'tsyringe';
import Client from './Client';

@injectable()
export default class Recommendation {
	public constructor(@inject(Client) public client: Client) {}
}
