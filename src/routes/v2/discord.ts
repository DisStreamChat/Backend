import express from "express";
import { validateRequest } from "../../middleware";
import { getProfilePicture } from "../../utils/functions/users";
const router = express.Router();

import sha1 from "sha1";
import fetch from "fetchio-js";
import admin, { auth, firestore } from "firebase-admin";
import { getUserInfo } from "../../utils/DiscordClasses";
import { DiscordClient, DiscordOauthClient } from "../../utils/initClients";
import { Channel, MessageEmbed, TextChannel } from "discord.js";
import { generateRankCard } from "../../utils/functions";
import { log } from "../../utils/functions/logging";
import { Platform } from "../../models/platform.enum";

// get invite link to our discord
router.get("/", (req, res) => {
	res.redirect("https://discord.gg/sFpMKVX");
});

// redirect to the invite page for the bot you can specify a guild if you want
router.get("/invite", (req, res) => {
	const guildId = req.query.guild;
	const inviteURL =
		"https://discord.com/oauth2/authorize?client_id=702929032601403482&permissions=470035670&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F%3Fdiscord%3Dtrue&scope=bot";
	if (guildId) {
		res.redirect(`${inviteURL}&guild_id=${guildId}`);
	} else {
		res.redirect(inviteURL);
	}
});

router.get("/ismember", (req, res, next) => {
	res.json({ result: !!DiscordClient.guilds.resolve(req.query.guild as string) });
});

router.get("/getchannels", async (req, res, next) => {
	try {
		const id = req.query.guild;
		const selectedGuild = await DiscordClient.guilds.resolve(id as string);
		const channelManger = selectedGuild.channels;
		const channels = channelManger.cache
			.array()
			.filter(channel => channel.type == "text")
			.map(channel => {
				const parent = channel.parent ? channel.parent.name : "";
				return { id: channel.id, name: channel.name, parent: parent };
			});
		const roleManager = selectedGuild.roles;
		const roles = roleManager.cache.array(); /*.filter(role => !role.managed);*/
		if (req.query.new) {
			res.json({ channels, roles });
		} else {
			res.json(channels);
		}
	} catch (err) {
		log(`Error getting channels: ${err.message}`);

		res.json([]);
	}
});

router.get("/resolvechannel", async (req, res, next) => {
	const { guild, channel } = req.query;
	const response = await fetch("https://api.disstreamchat.com/v2/discord/getchannels?guild=" + guild);
	res.json(response.find((ch: Channel) => ch.id === channel));
});

router.get("/resolveguild", async (req, res, next) => {
	const { id } = req.query;
	const selectedGuild = await DiscordClient.guilds.resolve(id as string);
	res.json(selectedGuild);
});

router.get("/resolveuser", async (req, res, next) => {
	try {
		res.json(await DiscordClient.users.fetch(req.query.user as string));
	} catch (err) {
		next(err);
	}
});

router.get("/token/refresh", validateRequest, async (req, res, next) => {
	const redirect_uri = req.query["redirect_uri"] || process.env.REDIRECT_URI;
	try {
		const { token } = req.query;
		const tokenData = await DiscordOauthClient.tokenRequest({
			refreshToken: token as string,
			scope: "identify guilds",
			grantType: "refresh_token",
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			redirectUri: redirect_uri + "/?discord=true",
		});
		res.json({ userData: await getUserInfo(tokenData), tokenData });
	} catch (err) {
		next(err);
	}
});

router.delete("/reactionmessage", validateRequest, async (req, res, next) => {
	try {
		const { channel, message, server } = req.body;
		const guild = await DiscordClient.guilds.cache.get(server);
		const channelObj = guild.channels.resolve(channel) as TextChannel;
		const messageToDelete = await channelObj.messages.fetch(message);
		await messageToDelete.delete();
		res.json({ code: 200, message: "success" });
	} catch (err) {
		res.json({ code: 500, message: err.message });
	}
});

router.get("/rankcard", async (req, res, next) => {
	const { user, guild } = req.query;
	const guildObj = DiscordClient.guilds.cache.get(guild as string);
	const member = await guildObj.members.fetch(user as string);
	const userData = (
		await firestore()
			.collection("Leveling")
			.doc(guild as string)
			.collection("users")
			.doc(user as string)
			.get()
	).data();
	const customRankCardData = (await firestore().collection("Streamers").where("discordId", "==", user).get()).docs[0].data();
	const rankcard = await generateRankCard({ ...userData, ...(customRankCardData || {}) }, member, false);
	res.setHeader("content-type", "text/html");
	res.send(rankcard);
});

router.post("/reactionmessage", validateRequest, async (req, res, next) => {
	try {
		const { channel, message, reactions, server } = req.body;
		const guild = await DiscordClient.guilds.cache.get(server);
		const channelObj = guild.channels.resolve(channel) as TextChannel;
		const embed = new MessageEmbed().setDescription(message).setColor("#2d688d");
		const sentMessage = await channelObj.send(embed);
		for (let reaction of reactions) {
			try {
				if (reaction.length > 5) {
					reaction = DiscordClient.emojis.cache.get(reaction);
				}
				await sentMessage.react(reaction);
			} catch (err) {
				log(`error in reacting to message: ${err.message}`);
			}
		}
		res.json({ code: 200, message: "success", messageId: sentMessage.id });
	} catch (err) {
		res.json({ code: 500, message: err.message });
	}
});

router.patch("/reactionmessage", validateRequest, async (req, res, next) => {
	try {
		const { channel, message, server, messageId } = req.body;
		const guild = await DiscordClient.guilds.cache.get(server);
		const channelObj = guild.channels.resolve(channel) as TextChannel;
		const embed = new MessageEmbed().setDescription(message).setColor("#2d688d");
		const messageToEdit = await channelObj.messages.fetch(messageId);
		const edited = await messageToEdit.edit(embed);
		res.json({ code: 200, message: "success", messageId: edited.id });
	} catch (err) {
		res.json({ code: 500, message: err.message });
	}
});

router.get("/token", async (req, res, next) => {
	try {
		const redirect_uri = req.query["redirect_uri"] || process.env.REDIRECT_URI;
		log(`redirect uri: ${redirect_uri}/?discord=true`);
		const code = req.query.code;
		if (!code) {
			return res.status(401).json({
				status: 401,
				message: "Missing Auth Token",
			});
		}
		const body = {
			code: code,
			scope: "identify guilds",
			grantType: "authorization_code",
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			redirectUri: redirect_uri + "/?discord=true",
		};
		//@ts-ignore
		const tokenData = await DiscordOauthClient.tokenRequest(body);
		const discordInfo = await getUserInfo(tokenData);
		if (req.query.create) {
			const uid = sha1(discordInfo.id);
			let token = await auth().createCustomToken(uid);
			try {
				await firestore().collection("Streamers").doc(uid).update({
					displayName: discordInfo.name,
					profilePicture: discordInfo.profilePicture,
					name: discordInfo.name.toLowerCase(),
					discordId: discordInfo.id,
				});
			} catch (err) {
				await firestore()
					.collection("Streamers")
					.doc(uid)
					.set({
						displayName: discordInfo.name,
						profilePicture: discordInfo.profilePicture,
						name: discordInfo.name.toLowerCase(),
						uid: uid,
						discordId: discordInfo.id,
						ModChannels: [],
						appSettings: {
							TwitchColor: "",
							YoutubeColor: "",
							discordColor: "",
							displayPlatformColors: false,
							displayPlatformIcons: false,
							highlightedMessageColor: "",
							showHeader: true,
							showSourceButton: false,
							compact: false,
							showBorder: false,
							nameColors: true,
						},
						discordLinked: true,
						guildId: [],
						liveChatId: [],
						overlaySettings: {
							TwitchColor: "",
							YoutubeColor: "",
							discordColor: "",
							displayPlatformColors: false,
							displayPlatformIcons: false,
							highlightedMessageColor: "",
							nameColors: true,
							compact: false,
						},
						twitchAuthenticated: false,
						youtubeAuthenticated: false,
					});
			}
			res.json({ ...discordInfo, token });
		} else {
			res.json(discordInfo);
		}
	} catch (err) {
		// res.send
		next(err);
	}
});

router.get("/guildcount", async (req, res, next) => {
	res.json(DiscordClient.guilds.cache.array().length);
});

router.get("/profilepicture", async (req, res, next) => {
	try {
		const { user } = req.query;
		const profilePicture = await getProfilePicture(Platform.DISCORD, user as string);
		res.json(profilePicture);
	} catch (err) {
		next(err);
	}
});

router.get("/resolveemote", async (req, res, next) => {
	try {
		const { emote, guild } = req.query;
		const emoteObject = DiscordClient.emojis.resolve(emote as string);
		res.json(emoteObject);
	} catch (err) {
		next(err);
	}
});

router.get("/emotes", async (req, res, next) => {
	res.json(DiscordClient.emojis.cache.array());
});

router.get("/position", async (req, res, next) => {
	try {
		const { server } = req.query;
		const guild = await DiscordClient.guilds.fetch(server as string);
		const member = guild.member(DiscordClient.user);
		const highestRole = member.roles.highest;
		res.json({ position: highestRole.position, rawPosition: highestRole.rawPosition });
	} catch (err) {
		res.status(401).json({ message: err.message });
	}
});

router.post("/details", async (req, res, next) => {
	const { id } = req.query;
	await admin
		.firestore()
		.collection("Streamers")
		.doc(id as string)
		.collection("discord")
		.doc("data")
		.set(req.body, { merge: true });
	res.end();
});

export default router;
