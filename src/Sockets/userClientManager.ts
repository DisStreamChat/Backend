import fetch from "node-fetch";
import tmi from "tmi.js";

import { ArrayAny } from "../utils/functions";

class UserClientManager {
	private static readonly REQUIRED_SCOPES = ["chat:edit", "chat:read", "channel:moderate"];

	_userClients: Map<string, tmi.Client> = new Map();

	async create(refreshToken: string, modName: string, twitchName: string) {
		const response = await fetch(
			`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}&key=${process.env.DSC_API_KEY}`
		);
		const data = await response.json();
		if (!data) {
			throw new Error("bad refresh token");
		}
		const scopes = data.scope;
		if (!ArrayAny(scopes, UserClientManager.REQUIRED_SCOPES)) {
			throw new Error("bad scopes");
		}
		const userClient = new tmi.Client({
			options: { debug: false },
			connection: {
				secure: true,
				reconnect: true,
			},
			identity: {
				username: modName,
				password: data.access_token,
			},
			channels: [twitchName],
		});
		this._userClients.set(modName, userClient);
		await userClient.connect();
		return userClient;
	}

	async getOrCreate(refreshToken: string, modName: string, twitchName: string) {
		if (this._userClients.get(modName)) return this._userClients.get(modName);
		const client = await this.create(refreshToken, modName, twitchName);
		client.join(twitchName);
		return client;
	}

	async get(modName: string) {
		return this._userClients.get(modName);
	}
}

export const userClientManager = new UserClientManager();
