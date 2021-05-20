import tmi, { Events } from "tmi.js";
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

	async on(event: keyof Events, callback) {
		this._client.on(event, callback);
	}

	async leave(channel: string) {
		try {
			await this._client.part(channel);
		} catch (err) {
			log(err, { error: true });
		}
	}

	async isMod(channel: string, username: string) {
		try {
			return await this._client.isMod(channel, username);
		} catch (err) {
			log(err, { error: true });
			return false;
		}
	}

	async mods(channel: string) {
		try {
			return await this._client.mods(channel);
		} catch (err) {
			log(err, { error: true });
			return [];
		}
	}
}
