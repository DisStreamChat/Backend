
import {Client} from "discord.js";
import tmi from "tmi.js";
import {initializeApp, credential, firestore} from "firebase-admin";
//@ts-ignore
import  TwitchApi from "twitchio-js";
//@ts-ignore
import  DiscordOauth2 from "discord-oauth2";
import {cycleBotStatus} from "../utils/functions"

// get the serviceAccount details from the base64 string stored in environment variables
const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
initializeApp({
	credential: credential.cert(serviceAccount),
});

// initialize the discord client
export const DiscordClient = new Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
DiscordClient.login(process.env.BOT_TOKEN);

// const DBL = require("dblapi.js");
// const dbl = new DBL(process.env.TOP_GG_TOKEN, DiscordClient);

let serverLength = 0;

DiscordClient.on("ready", async () => {
	console.log("bot ready");
	serverLength = DiscordClient.guilds.cache.array().length;
	cycleBotStatus(DiscordClient, [
		{
			status: "online",
			activity: { type: "WATCHING", name: `🔴 Live Chat in ${DiscordClient.guilds.cache.array().length} servers` },
		},
		{
			status: "online",
			activity: { type: "WATCHING", name: `@${DiscordClient.user.username} help` },
		}
	], 30000)
	// setInterval(() => {
	// 	serverLength = DiscordClient.guilds.cache.array().length;
	// }, hoursToMillis(0.25));
});

// initialize the twitch client
export const TwitchClient = new tmi.Client({
	options: { debug: process.env.TWITCH_DEBUG == "true" },
	connection: {
		// server: "irc.fdgt.dev",
		secure: true,
		reconnect: true,
	},
	identity: {
		username: "disstreamchat",
		password: process.env.TWITH_OAUTH_TOKEN,
	},
	channels: [process.env.DEBUG_CHANNEL || ""],
});
TwitchClient.connect();

export const getCustomBots = async () => {
	if(process.env.BOT_DEV == "true") return new Map()
	const botQuery = firestore().collection("customBot");
	const botRef = await botQuery.get();
	const bots : any[] = botRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
	// exports.customBots = customBots
	return customBots;
};

export const TwitchApiClient = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationKey: process.env.TWITCH_ACCESS_TOKEN,
});

export const DiscordOauthClient  = new DiscordOauth2({
	clientId: process.env.DISCORD_CLIENT_ID,
	clientSecret: process.env.DISCORD_CLIENT_SECRET,
	redirectUri: process.env.REDIRECT_URI + "/?discord=true",
});

export const KrakenApiClient  = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationKey: process.env.TWITCH_ACCESS_TOKEN,
	kraken: true,
});

export const customBots = getCustomBots()