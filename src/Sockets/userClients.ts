;

import fetch from "node-fetch";
import tmi from "tmi.js";
import { ArrayAny } from "../utils/functions";

const userClients = {}

const requiredScopes = ["chat:edit", "chat:read", "channel:moderate"]

export const createUserClient = async (refreshToken, modName, twitchName) => {
	const response = await fetch(
		`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}&key=${process.env.DSC_API_KEY}`
	);
	const data = await response.json();
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
	return userClient
}

export const getUserClient = async (refreshToken, modName, twitchName) => {
	if(userClients[modName]) return userClients[modName]
	const client = await createUserClient(refreshToken, modName, twitchName)
	client.join(twitchName)
	return client
}