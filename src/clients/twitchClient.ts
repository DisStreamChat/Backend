import tmi from "tmi.js";
import { log } from "../utils/functions/logging";
export class TwitchClient {
	constructor(private _client: tmi.Client) {}

	join(channel: string) {
		this._client.join(channel).catch(err => {
			log(err.message || err, { error: true });
		});
	}

	connect() {
		this._client.connect();
	}

	get channels() {
		return this._client.getChannels();
	}

	async deleteMessage(channelName: string, messageId: string) {
		try {
			this._client.deletemessage(channelName, messageId);
		} catch (err) {
			log(err.message, { error: true });
		}
	}

	async timeout(channelName: string, user: string, duration?: number) {
		try {
			await this._client.timeout(channelName, user, duration ?? 300);
		} catch (err) {
			log(err.message, { error: true });
		}
	}

	async ban(channelName: string, user: string, reason?: string) {
		try {
			await this._client.ban(channelName, user, reason);
		} catch (err) {
			log(err.message, { error: true });
		}
	}
}
