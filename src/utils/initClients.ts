import { Client } from "discord.js";
import tmi from "tmi.js";
import { initializeApp, credential, firestore } from "firebase-admin";
import TwitchApi from "twitchio-js";
import DiscordOauth2 from "discord-oauth2";
import { cycleBotStatus, isPremium } from "../utils/functions";
import { log } from "./functions/logging";
import { TwitchClient } from "../clients/twitch.client";
import { DiscordClient } from "../clients/discord.client";
import { config } from "./env";
// import { AutoPoster } from "topgg-autoposter";

try {
	const serviceAccount = JSON.parse(Buffer.from(config.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

	initializeApp({
		credential: credential.cert(serviceAccount),
	});
	firestore().settings({ ignoreUndefinedProperties: true });
} catch (err) {}

export const discordClient = new DiscordClient({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
discordClient.login(config.PREMIUM_BOT ? config.PREMIUM_BOT_TOKEN : config.BOT_TOKEN);

// const ap = AutoPoster(config.TOP_GG_TOKEN, discordClient);

// ap.on("posted", () => {
// 	console.log("Posted stats to Top.gg!")
// });

if (!config.PREMIUM_BOT) {
	discordClient.on("ready", async () => {
		log("bot ready", { writeToConsole: true });
		cycleBotStatus(
			discordClient,
			[
				{
					status: "online",
					activity: (client: Client) => ({
						type: "WATCHING",
						name: `🔴 Live Chat in ${client.guilds.cache.array().length} servers`,
					}),
				},
				{
					status: "online",
					activity: (client: Client) => ({ type: "WATCHING", name: `@${client.user.username} help` }),
				},
			],
			30000
		);
	});
}

export const twitchClient = new TwitchClient(
	new tmi.Client({
		options: { debug: config.TWITCH_DEBUG == "true" },
		connection: {
			secure: true,
			reconnect: true,
		},
		identity: {
			username: "disstreamchat",
			password: config.TWITH_OAUTH_TOKEN,
		},
		channels: [config.DEBUG_CHANNEL || ""],
	})
);
twitchClient.connect();

export const getCustomBots = async (): Promise<Map<string, DiscordClient>> => {
	if (config.BOT_DEV || config.PREMIUM_BOT) return new Map();
	const botQuery = firestore().collection("customBot");
	const botRef = await botQuery.get();
	const bots: any[] = botRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const customBots = new Map();
	for (const bot of bots) {
		const botClient = new DiscordClient({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
		await botClient.login(bot.token);
		botClient.once("ready", async () => {
			for (const [snowflake, guild] of botClient.guilds.cache) {
				if (!(await isPremium(guild))) {
					guild.leave();
				}
			}
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
};

export const TwitchApiClient = new TwitchApi({
	clientId: config.TWITCH_CLIENT_ID,
	authorizationKey: config.TWITCH_ACCESS_TOKEN,
});

export const DiscordOauthClient = new DiscordOauth2({
	clientId: config.DISCORD_CLIENT_ID,
	clientSecret: config.DISCORD_CLIENT_SECRET,
	redirectUri: config.REDIRECT_URI + "/?discord=true",
});

export const KrakenApiClient = new TwitchApi({
	clientId: config.TWITCH_CLIENT_ID,
	authorizationKey: config.TWITCH_ACCESS_TOKEN,
	kraken: true,
});

export const customBots = getCustomBots();
