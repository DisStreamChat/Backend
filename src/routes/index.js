require("dotenv").config();
import express from "express";
const router = express.Router();
import sha1 from "sha1";
import fetch from "node-fetch";
import TwitchApi from "twitch-lib";
import admin from "firebase-admin";
import { getUserInfo } from "../utils/DiscordClasses";
import {
	DiscordClient,
	TwitchClient,
	TwitchApiClient as Api,
	KrakenApiClient as KrakenApi,
	DiscordOauthClient,
} from "../utils/initClients";
import path from "path";
import { MessageEmbed } from "discord.js";
import { generateRankCard } from "../utils/functions";
import { validateRequest } from "../middleware";
import { getFfzEmotes, getBttvEmotes, subscribeToFollowers, initWebhooks } from "../utils/functions/TwitchFunctions";

initWebhooks()

// render the index.html file in the public folder when the /oauth/twitch endpoint is requested
router.get("/oauth/twitch", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../public/twitch.html"));
});

router.get("/oauth/discord", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../public/discord.html"));
});

// default endpoint
router.get("/", (req, res) => {
	res.json({
		message: "📺 DisTwitchChat API 📺",
	});
});

router.get("/makecoffee", (req, res) => {
	res.status(418).json({
		status: 418,
		message: "I'm a Teapot ☕",
	});
});

router.get("/ismember", (req, res, next) => {
	res.json({ result: !!DiscordClient.guilds.resolve(req.query.guild) });
});

router.get("/getchannels", async (req, res, next) => {
	try {
		const id = req.query.guild;
		const selectedGuild = await DiscordClient.guilds.resolve(id);
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
		console.log(`Error getting channels: ${err}`);
		res.json([]);
	}
});

router.get("/resolvechannel", async (req, res, next) => {
	const { guild, channel } = req.query;
	const response = await fetch("https://api.disstreamchat.com/getchannels?guild=" + guild);
	const json = await response.json();
	res.json(json.filter(ch => ch.id == channel)[0]);
});

// redirect to the invite page for the bot you can specify a guild if you want
router.get("/invite", (req, res) => {
	const guildId = req.query.guild;
	const inviteURL =
		"https://discord.com/api/oauth2/authorize?client_id=702929032601403482&permissions=8&redirect_uri=https%3A%2F%2Fwww.distwitchchat.com%2F%3Fdiscord%3Dtrue&scope=bot";
	if (guildId) {
		res.redirect(`${inviteURL}&guild_id=${guildId}`);
	} else {
		res.redirect(inviteURL);
	}
});

// get invite link to our discord
router.get("/discord", (req, res) => {
	res.redirect("https://discord.gg/sFpMKVX");
});

router.get("/app", async (req, res) => {
	const version = req.query.version;
	if (version) {
		return res.redirect(`https://github.com/DisTwitchChat/App/releases/download/v${version}/disstreamchat-Setup-${version}.exe`);
	}
	const apiURL = "https://api.github.com/repos/disstreamchat/App/releases";
	const response = await fetch(apiURL);
	const json = await response.json();
	res.redirect(json[0].assets[0].browser_download_url);
});

router.get("/discord/token/refresh", validateRequest, async (req, res, next) => {
	try {
		const token = req.query.token;
		const tokenData = await DiscordOauthClient.tokenRequest({
			refreshToken: token,
			scope: "identify guilds",
			grantType: "refresh_token",
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			redirectUri: process.env.REDIRECT_URI + "/?discord=true",
		});
		res.json({ userData: await getUserInfo(tokenData), tokenData });
	} catch (err) {
		next(err);
	}
});

router.get("/discord/token", async (req, res, next) => {
	try {
		const redirect_uri = req.query["redirect_uri"] || process.env.REDIRECT_URI;
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
		const tokenData = await DiscordOauthClient.tokenRequest(body);
		const discordInfo = await getUserInfo(tokenData);
		if (req.query.create) {
			const uid = sha1(discordInfo.id);
			let token = await admin.auth().createCustomToken(uid);
			try {
				await admin.firestore().collection("Streamers").doc(uid).update({
					displayName: discordInfo.name,
					profilePicture: discordInfo.profilePicture,
					name: discordInfo.name.toLowerCase(),
					discordId: discordInfo.id,
				});
			} catch (err) {
				await admin
					.firestore()
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

router.get("/emotes", async (req, res, next) => {
	const user = req.query.user;
	if (!user) {
		return res.status(400).json({ message: "missing user", code: 400 });
	}
	const userInfo = await Api.getUserInfo(user);
	const id = userInfo.id;
	const firebaseId = sha1(id);
	const userDataRef = admin.firestore().collection("Streamers").doc(firebaseId);
	const userTwitchDataRef = userDataRef.collection("twitch").doc("data");
	const userTwitchData = (await userTwitchDataRef.get()).data();
	const refreshToken = userTwitchData?.refresh_token;
	const response = await fetch(`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}&key=${process.env.DSC_API_KEY}`);
	const json = await response.json();
	const scopes = json.scope;
	if (!scopes || !scopes.includes("user_subscriptions")) {
		return res.status(401).json({ message: "missing scopes", code: 401 });
	}
	const apiUrl = `https://api.twitch.tv/kraken/users/${id}/emotes`;
	const userApi = new TwitchApi({
		clientId: process.env.TWITCH_CLIENT_ID,
		authorizationToken: json.access_token,
		kraken: true,
	});
	const emotes = await userApi.fetch(apiUrl, {
		headers: {
			Accept: "application/vnd.twitchtv.v5+json",
			Authorization: `OAuth ${json.access_token}`,
		},
	});
	res.json(emotes);
});

router.get("/checkmod", async (req, res, next) => {
	let channelName = req.query.channel;

	if (!channelName) {
		return res.status(400).json({ message: "missing channel name", code: 400 });
	}
	if (!channelName.startsWith("#")) {
		channelName = "#" + channelName;
	}

	const userName = req.query.user;
	try {
		const inChannels = await TwitchClient.getChannels();
		const alreadyJoined = inChannels.includes(channelName);

		if (!alreadyJoined) {
			const userData = await Api.getUserInfo(channelName.substring(1));
			if (userData) {
				await TwitchClient.join(channelName);
			} else {
				return res.status(400).json({ message: "invalid channel name, it seems like that isn't a twitch channel", code: 400 });
			}
		}
		const results = await TwitchClient.mods(channelName);

		const isMod = !!userName && results.includes(userName.toLowerCase());
		if (isMod) {
			return res.json(await Api.getUserInfo(channelName.substring(1)));
		} else {
			return res.json(null);
		}
	} catch (err) {
		try {
			console.log(`failed to join channel: ${err.message}`);
			let isMod = TwitchClient.isMod(channelName, userName);
			const chatters = await Api.fetch(`https://api.disstreamchat.com/chatters?user=${channelName.substring(1)}`);
			isMod = chatters?.moderators?.includes?.(userName) || isMod;
			TwitchClient.part(channelName);
			if (isMod) {
				return res.json(await Api.getUserInfo(channelName.substring(1)));
			}
		} catch (err) {
			TwitchClient.part(channelName);
			return res.status(500).json(null);
		}
	}
	res.json(null);
});

router.get("/profilepicture", async (req, res, next) => {
	try {
		const platform = req.query.platform;
		const user = req.query.user;
		let profilePicture;
		if (platform === "twitch" || !platform) {
			profilePicture = (await Api.getUserInfo(user))["profile_image_url"];
		} else if (platform === "discord") {
			const userObj = await DiscordClient.users.fetch(req.query.user);
			profilePicture = userObj.displayAvatarURL({ format: "png" });
		}
		if (!profilePicture) {
			throw new Error("invalid profile picture");
		}
		res.json(profilePicture);
	} catch (err) {
		next(err);
	}
});

router.get("/modchannels", async (req, res, next) => {
	try {
		const user = req.query.user;
		const modChannels = await Api.getUserModerationChannels(user);
		res.json(modChannels);
	} catch (err) {
		next(err);
	}
});

router.get("/twitch/token/refresh", validateRequest, async (req, res, next) => {
	const refresh_token = req.query.token;
	const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_APP_CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${refresh_token}`;
	const response = await fetch(apiURL, { method: "POST" });
	const json = await response.json();
	res.json(json);
});

router.get("/token", async (req, res, next) => {
	try {
		// get the oauth code from the the request
		const code = req.query.code;

		// get the access token and refresh token from the from the twitch oauth2 endpoint
		const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_APP_CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${process.env.REDIRECT_URI}`;
		const response = await fetch(apiURL, {
			method: "POST",
		});
		const json = await response.json();

		// get the user info like username and user id by validating the access token with twitch
		const validationResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
			headers: {
				Authorization: `OAuth ${json.access_token}`,
			},
		});

		const validationJson = await validationResponse.json();
		if (!validationResponse.ok) {
			res.status(validationJson.status);
			err = new Error(validationJson.message);
			next(err);
		} else {
			const { login, user_id } = validationJson;
			const ModChannels = await Api.getUserModerationChannels(login);

			// automatically mod the bot in the users channel on sign in
			try {
				const UserClient = new tmi.Client({
					options: { debug: false },
					connection: {
						secure: true,
						reconnect: true,
					},
					identity: {
						username: login,
						password: json.access_token,
					},
					channels: [login],
				});
				await UserClient.connect();
				await UserClient.say(login, "/mod disstreamchat");
				await UserClient.disconnect();
			} catch (err) {}

			const uid = sha1(user_id);
			const token = await admin.auth().createCustomToken(uid);
			const userInfo = await Api.getUserInfo(login);
			const displayName = userInfo.display_name;
			const profilePicture = userInfo.profile_image_url;

			// set or modify the user data in firestore
			try {
				await admin.firestore().collection("Streamers").doc(uid).update({
					displayName,
					profilePicture,
					TwitchName: displayName.toLowerCase(),
					name: displayName.toLowerCase(),
					twitchId: user_id,
				});
			} catch (err) {
				await admin
					.firestore()
					.collection("Streamers")
					.doc(uid)
					.set({
						twitchId: user_id,
						displayName,
						uid: uid,
						profilePicture,
						ModChannels: [],
						TwitchName: displayName.toLowerCase(),
						name: displayName.toLowerCase(),
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
						discordLinked: false,
						guildId: "",
						liveChatId: "",
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
						twitchAuthenticated: true,
						youtubeAuthenticated: false,
					});
			}

			await admin.firestore().collection("Streamers").doc(uid).collection("twitch").doc("data").set({
				user_id,
				refresh_token: json.refresh_token,
			});

			// setup the follow webhook if there isn't already one
			const hasConnection =
				(await admin.firestore().collection("webhookConnections").where("channelId", "==", user_id).get()).docs.length > 0;
			if (!hasConnection) {
				subscribeToFollowers(user_id, sevenDays);
				admin.firestore().collection("webhookConnections").doc(uid).set({
					channelId: user_id,
				});
			}

			res.json({
				token,
				displayName: userInfo.display_name,
				profilePicture: userInfo.profile_image_url,
				ModChannels,
				refresh_token: json.refresh_token,
			});
		}
	} catch (err) {
		next(err);
	}
});

router.get("/resolveuser", async (req, res, next) => {
	if (!req.query.user) return res.status(400).json({ message: "missing user" });
	if (!req.query.platform) return res.status(400).json({ message: "missing platform" });
	if (req.query.platform === "twitch") {
		res.json(await Api.getUserInfo(req.query.user));
	} else if (req.query.platform === "discord") {
		try {
			res.json(await DiscordClient.users.fetch(req.query.user));
		} catch (err) {
			next(err);
		}
	}
});

router.get("/resolveguild", async (req, res, next) => {
	if (!req.query.guild) return res.status(400).json({ message: "missing guild id" });
	try {
		res.json(await DiscordClient.guilds.resolve(req.query.guild));
	} catch (err) {
		next(err);
	}
});

router.get("/chatters", async (req, res, next) => {
	try {
		const response = await fetch(`https://tmi.twitch.tv/group/user/${req.query.user}/chatters`);
		const json = await response.json();
		let onlineBots = [];
		let count = 0;
		for (let [key, value] of Object.entries(json.chatters || {})) {
			json.chatters[key] = value.filter(name => !onlineBots.includes(name));
			count += json.chatters[key].length;
		}
		json.chatter_count = count;
		res.json(json);
	} catch (err) {
		setTimeout(() => {
			try {
				TwitchClient.join(req.query.user);
			} catch (err) {
				console.log(`Error getting channels: ${err}`);
			}
		}, 1000);
		res.json({ message: err.message, status: 500 });
	}
});

router.get("/stats/twitch", async (req, res, next) => {
	try {
		const streamerName = req.query.name;
		const isNew = req.query.new;
		const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${streamerName}`;
		const chattersUrl = `https://api.disstreamchat.com/chatters/?user=${streamerName}`;
		const streamDataResponse = await Api.fetch(apiUrl);
		const response = await fetch(chattersUrl);
		const json = await response.json();
		const streamData = streamDataResponse.data;
		const stream = streamData[0];
		if (stream) {
			stream.all_viewers = stream.viewer_count;
			// stream.viewer_count = json.chatter_count;
			stream.isLive = true;
			return res.json(stream);
		} else if (isNew) {
			return res.json({
				viewer_count: json.chatter_count,
				isLive: false,
			});
		}
		res.json(null);
	} catch (err) {
		res.json(null);
	}
});

router.get("/webhooks/twitch", async (req, res, next) => {
	// console.log(req.query);
	res.send(req.query["hub.challenge"]);
});

router.get("/createauthtoken", async (req, res, next) => {
	const oneTimeCode = req.query.code;
	const idToken = req.query.token;
	const decodedToken = await admin.auth().verifyIdToken(idToken);
	const uid = decodedToken.uid;
	const authToken = await admin.auth().createCustomToken(uid);
	await admin.firestore().collection("oneTimeCodes").doc(oneTimeCode).set({ authToken });
	res.json({ authToken });
});

router.post("/setauthtoken", async (req, res, next) => {
	await admin.firestore().collection("oneTimeCodes").doc(req.query.code).set({ authToken: req.query.token });
	res.json("success");
});

router.get("/fonts", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../public/fonts.css"));
});

router.get("/name", (req, res, next) => {
	res.send("DisStreamChat");
});

router.get("/customemotes", async (req, res, next) => {
	const channelName = req.query.channel || req.query.name;
	if (!channelName) return res.status(400).json({ message: "missing channel name", code: 400 });
	const [bttv, ffz] = await Promise.all([getBttvEmotes(channelName), getFfzEmotes(channelName)]);
	res.json({ bttv, ffz });
});

router.get("/twitch/channels", async (req, res, next) => {
	res.json(await TwitchClient.getChannels());
});

router.get("/twitch/follows", async (req, res, next) => {
	const user = req.query.user;
	if (!user) {
		res.status(400).json({ messages: "missing user", code: 400 });
	}
	const userData = await Api.getUserInfo(user);
	const id = userData.id;
	const json = await KrakenApi.fetch(`https://api.twitch.tv/kraken/users/${id}/follows/channels?limit=${req.query.limit || 100}`, {
		headers: {
			Accept: "application/vnd.twitchtv.v5+json",
		},
	});
	try {
		let followedChannels = [];
		const key = req.query.key;
		if (!key) {
			followedChannels = json.follows;
		} else {
			followedChannels = json.follows.map(follow => follow.channel[key]);
		}
		res.json(followedChannels);
	} catch (err) {
		res.json(json);
	}
});

router.put("/twitch/follow", validateRequest, async (req, res, next) => {
	const user = req.query.user;
	const channel = req.query.channel;
	const userInfo = await Api.getUserInfo(user);
	const channelInfo = await Api.getUserInfo(channel);
	const firebaseId = sha1(userInfo.id);
	try {
		const userFirebaseData = (
			await admin.firestore().collection("Streamers").doc(firebaseId).collection("twitch").doc("data").get()
		).data();
		const refreshData = await Api.fetch(
			`https://api.disstreamchat.com/twitch/token/refresh?token=${userFirebaseData.refresh_token}&key=${process.env.DSC_API_KEY}`
		);
		const userApi = new TwitchApi({
			clientId: process.env.TWITCH_CLIENT_ID,
			authorizationToken: refreshData.access_token,
			kraken: true,
		});
		await userApi.fetch(`https://api.twitch.tv/kraken/users/${userInfo.id}/follows/channels/${channelInfo.id}`, {
			method: "PUT",
			headers: {
				Accept: "application/vnd.twitchtv.v5+json",
				"Client-ID": process.env.TWITCH_CLIENT_ID,
				Authorization: `OAuth ${refreshData.access_token}`,
			},
		});
		res.json("success");
	} catch (err) {
		next(err);
	}
});

router.delete("/twitch/follow", validateRequest, async (req, res, next) => {
	const user = req.query.user;
	const channel = req.query.channel;
	const userInfo = await Api.getUserInfo(user);
	const channelInfo = await Api.getUserInfo(channel);
	const firebaseId = sha1(userInfo.id);
	try {
		const userFirebaseData = (
			await admin.firestore().collection("Streamers").doc(firebaseId).collection("twitch").doc("data").get()
		).data();
		const refreshData = await Api.fetch(
			`https://api.disstreamchat.com/twitch/token/refresh?token=${userFirebaseData.refresh_token}&key=${process.env.DSC_API_KEY}`
		);
		const userApi = new TwitchApi({
			clientId: process.env.TWITCH_CLIENT_ID,
			authorizationToken: refreshData.access_token,
			kraken: true,
		});
		await fetch(`https://api.twitch.tv/kraken/users/${userInfo.id}/follows/channels/${channelInfo.id}`, {
			method: "DELETE",
			headers: {
				Accept: "application/vnd.twitchtv.v5+json",

				Authorization: `OAuth ${refreshData.access_token}`,
			},
			body: "",
		});
		res.json("success");
	} catch (err) {
		next(err);
	}
});

router.post("/automod/:action", validateRequest, async (req, res, next) => {
	const action = req.params.action;
	const firebaseId = req.query.id || " ";
	try {
		const userFirebaseData = (
			await admin.firestore().collection("Streamers").doc(firebaseId).collection("twitch").doc("data").get()
		).data();
		const refreshData = await Api.fetch(
			`https://api.disstreamchat.com/twitch/token/refresh?token=${userFirebaseData.refresh_token}&key=${process.env.DSC_API_KEY}`
		);
		const response = await Api.fetch(`https://api.twitch.tv/kraken/chat/twitchbot/${action}`, {
			body: JSON.stringify({ msg_id: req.query.msg_id }),
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/vnd.twitchtv.v5+json",
				"Client-ID": process.env.TWITCH_CLIENT_ID,
				Authorization: `OAuth ${refreshData?.access_token}`,
			},
		});
		res.json({ message: "success" });
	} catch (err) {
		next(err);
	}
});

router.get("/rankcard", async (req, res, next) => {
	const { user, guild } = req.query;
	const guildObj = DiscordClient.guilds.cache.get(guild);
	const member = await guildObj.members.fetch(user);
	const userData = (await admin.firestore().collection("Leveling").doc(guild).collection("users").doc(user).get()).data();
	const rankcard = await generateRankCard(userData, member);
	res.setHeader("content-type", "image/png");
	res.write(rankcard.toBuffer(), "binary");
	res.end(null, "binary");
});

router.post("/discord/reactionmessage", validateRequest, async (req, res, next) => {
	try {
		const { channel, message, reactions, server } = req.body;
		const guild = await DiscordClient.guilds.cache.get(server);
		const channelObj = guild.channels.resolve(channel);
		const embed = new MessageEmbed().setDescription(message).setColor("#2d688d");
		const sentMessage = await channelObj.send(embed);
		for (const reaction of reactions) {
			try {
				if (reaction.length > 5) {
					reaction = guild.emojis.cache.get(reaction);
				}
				await sentMessage.react(reaction);
			} catch (err) {
				console.log(`error in reacting to message: ${err.message}`);
			}
		}
		res.json({ code: 200, message: "success", messageId: sentMessage.id });
	} catch (err) {
		res.json({ code: 500, message: err.message });
	}
});

router.delete("/discord/reactionmessage", validateRequest, async (req, res, next) => {
	try {
		const { channel, message, server } = req.body;
		const guild = await DiscordClient.guilds.cache.get(server);
		const channelObj = guild.channels.resolve(channel);
		const messageToDelete = await channelObj.messages.fetch(message);
		await messageToDelete.delete();
		res.json({ code: 200, message: "success" });
	} catch (err) {
		res.json({ code: 500, message: err.message });
	}
});

module.exports = router;
