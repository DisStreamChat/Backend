import fetch from "fetchio-js";
import tmi from "tmi.js";
import { config } from "../utils/env";
import { ArrayAny } from "../utils/functions";
import { log } from "../utils/functions/logging";

const userClients = {};

const requiredScopes = ["chat:edit", "chat:read", "channel:moderate"];

export const createUserClient = async (refreshToken, modName, twitchName) => {
	const response = await fetch(`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}&key=${config.DSC_API_KEY}`);
	const data = response;
	if (!data) {
		throw new Error("bad refresh token");
	}
	const scopes = data.scope;
	if (!ArrayAny(scopes, requiredScopes)) {
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
	userClients[modName] = userClient;
	await userClient.connect();
	return userClient;
};

export const getUserClient = async (refreshToken: string, modName: string, twitchName: string) => {
	const oldClient = userClients[modName];
	if (oldClient) return oldClient;
	const client = await createUserClient(refreshToken, modName, twitchName);
	client.join(twitchName).catch(err => {
		log(err.message, { error: true });
	});
	return client;
};
