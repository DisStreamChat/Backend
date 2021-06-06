import { Client, Collection, MessageEmbed } from "discord.js";
import tmi from "tmi.js";
import { initializeApp, credential, firestore } from "firebase-admin";
import TwitchApi from "twitchio-js";
import DiscordOauth2 from "discord-oauth2";
import { cycleBotStatus, formatFromNow, resolveUser } from "../utils/functions";
import { log } from "./functions/logging";
import { TwitchClient } from "../clients/twitch.client";
import { DiscordClient } from "../clients/discord.client";
import DiscordButtons from "discord-buttons";

// get the serviceAccount details from the base64 string stored in environment variables
const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

initializeApp({
	credential: credential.cert(serviceAccount),
});

export const discordClient = new DiscordClient({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
DiscordButtons(discordClient);
discordClient.login(process.env.BOT_TOKEN);

// import DBL "dblapi.js";
// const dbl = new DBL(process.env.TOP_GG_TOKEN, DiscordClient);

discordClient.on("ready", async () => {
	log("bot ready", { writeToConsole: true });
	discordClient.registerSlashCommand(
		{
			data: {
				name: "whois",
				description: "Get Details about a user",
				options: [{ name: "user", description: "A users Name", type: 3, required: true }],
			},
		},
		async interaction => {
			const guild = await discordClient.guilds.fetch(interaction.guild.id);
			let member = await resolveUser(null as any, interaction.arguments.user, guild);

			const createdAt = formatFromNow(member.user.createdAt);

			const joinedAt = formatFromNow(member.joinedAt);
			let roles: string | Collection<string, any> = "This user has no roles";
			let size = 0;

			if (member.roles.cache.size !== 1) {
				// don't show the @everyone role
				roles = member.roles.cache.filter(role => role.name !== "@everyone") as Collection<string, any>;
				({ size } = roles);
				if (roles.size !== 1) {
					roles = `${roles
						// @ts-ignore
						.array()
						.slice(0, -1)
						.map(r => r)
						.join(", ")} and ${roles.last()}`;
				} else {
					roles = roles.first();
				}
			}

			const embed = new MessageEmbed()
				.setAuthor(member.displayName, member.user.displayAvatarURL())
				.setThumbnail(member.user.displayAvatarURL())
				.setTitle(`Information about ${member.displayName}`)
				.addField("Username", member.user.username, true)
				.addField("Account created", createdAt, true)
				.addField("Joined the server", joinedAt, true)
				.addField(`Roles - ${size}`, `${roles}`)
				.setColor(member.displayHexColor === "#000000" ? "#FFFFFF" : member.displayHexColor)
				.setFooter(`ID: ${member.id}`)
				.setTimestamp(new Date());

			interaction.reply({
				embed,
				flags: 64,
			});
		}
	);
	discordClient.slashCommandHandler();
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

export const twitchClient = new TwitchClient(
	new tmi.Client({
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
	})
);
twitchClient.connect();

export const getCustomBots = async (): Promise<Map<string, DiscordClient>> => {
	if (process.env.BOT_DEV == "true") return new Map();
	const botQuery = firestore().collection("customBot");
	const botRef = await botQuery.get();
	const bots: any[] = botRef.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const customBots = new Map();
	for (const bot of bots) {
		const botClient = new DiscordClient({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
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
};

export const TwitchApiClient = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationKey: process.env.TWITCH_ACCESS_TOKEN,
});

export const DiscordOauthClient = new DiscordOauth2({
	clientId: process.env.DISCORD_CLIENT_ID,
	clientSecret: process.env.DISCORD_CLIENT_SECRET,
	redirectUri: process.env.REDIRECT_URI + "/?discord=true",
});

export const KrakenApiClient = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationKey: process.env.TWITCH_ACCESS_TOKEN,
	kraken: true,
});

export const customBots = getCustomBots();
