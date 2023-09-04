//@ts-ignore
import DiscordOauth2 from "discord-oauth2";
import { Client } from "discord.js";
import { credential, firestore, initializeApp } from "firebase-admin";
import tmi from "tmi.js";
//@ts-ignore
import TwitchApi from "twitchio-js";

import { Duration, setDurationInterval } from "./duration.util";
import { EnvManager } from "./envManager.util";
import { Logger } from "./functions/logging";

class ClientManager {
	twitchApiClient: TwitchApi;
	krakenApiClient: TwitchApi;
	discordOauthClient: DiscordOauth2;
	customBots: Map<string, Client>;

	discordClient: Client;
	twitchClient: tmi.Client;

	constructor() {
		// get the serviceAccount details from the base64 string stored in environment variables
		const serviceAccount = JSON.parse(
			Buffer.from(EnvManager.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("ascii")
		);

		initializeApp({
			credential: credential.cert(serviceAccount),
		});

		this.discordClient.login(EnvManager.DISCORD_BOT_TOKEN);

		this.discordClient.on("ready", async () => {
			Logger.log("bot ready");
			this.cycleDiscordClientStatuses(
				[
					{
						status: "online",
						activity: {
							type: "WATCHING",
							name: `🔴 Live Chat in ${
								this.discordClient.guilds.cache.array().length
							} servers`,
						},
					},
					{
						status: "online",
						activity: {
							type: "WATCHING",
							name: `@${this.discordClient.user.username} help`,
						},
					},
				],
				Duration.fromMinutes(0.5)
			);
		});

		this.twitchClient = new tmi.Client({
			options: { debug: EnvManager.TWITCH_DEBUG_MODE },
			connection: {
				// server: "irc.fdgt.dev",
				secure: true,
				reconnect: true,
			},
			identity: {
				username: "disstreamchat",
				password: EnvManager.TWITH_OAUTH_TOKEN,
			},
			channels: [EnvManager.DEBUG_TWITCH_CHANNEL || ""],
		});
		this.twitchClient.connect();

		this.twitchApiClient = new TwitchApi({
			clientId: EnvManager.TWITCH_CLIENT_ID,
			authorizationKey: EnvManager.TWITCH_ACCESS_TOKEN,
		});

		this.discordOauthClient = new DiscordOauth2({
			clientId: EnvManager.DISCORD_CLIENT_ID,
			clientSecret: EnvManager.DISCORD_CLIENT_SECRET,
			redirectUri: EnvManager.TWITCH_OAUTH_REDIRECT_URI + "/?discord=true",
		});

		this.krakenApiClient = new TwitchApi({
			clientId: EnvManager.TWITCH_CLIENT_ID,
			authorizationKey: EnvManager.TWITCH_ACCESS_TOKEN,
			kraken: true,
		});
	}

	async init() {
		this.customBots = await this.getCustomBots();
	}

	cycleDiscordClientStatuses(statuses: { status: string; activity: any }[], timeout: Duration) {
		const setStatus = status => {
			if (typeof status === "function") {
				return this.discordClient.user.setPresence(status());
			}
			this.discordClient.user.setPresence(status);
		};

		let currentStatus = 0;
		setStatus(statuses[currentStatus]);

		setDurationInterval(() => {
			currentStatus += 1;
			currentStatus = currentStatus % statuses.length;
			setStatus(statuses[currentStatus]);
		}, timeout);
	}

	async getCustomBots() {
		if (EnvManager.BOT_DEV) return new Map();
		const botQuery = firestore().collection("customBot");
		const botRef = await botQuery.get();
		const bots: any[] = botRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		const customBots = new Map();
		for (const bot of bots) {
			const botClient = new Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
			await botClient.login(bot.token);
			botClient.once("ready", async () => {
				if (bot.status) {
					botClient.user.setPresence({
						status: "online",
						activity: { name: bot.status },
					});
				}
				try {
					if (bot.avatar) {
						await botClient.user.setAvatar(bot.avatar);
					}
				} catch (err) {}
			});
			customBots.set(bot.id, botClient);
		}
		return customBots;
	}
}

export const clientManager = new ClientManager();
async () => {
	await clientManager.init();
};
