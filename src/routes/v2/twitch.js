require("dotenv").config();
import express from "express";
import { validateRequest } from "../../middleware";
import { getProfilePicture } from "../../utils/functions/users";
import sha1 from "sha1";
import fetch from "node-fetch";
import TwitchApi from "twitch-lib";
import admin from "firebase-admin";
import {
	TwitchClient,
	TwitchApiClient as Api,
	KrakenApiClient as KrakenApi,
} from "../../utils/initClients";
import { getFfzEmotes, getBttvEmotes, subscribeToFollowers, initWebhooks } from "../../utils/functions/TwitchFunctions";
const router = express.Router();

const followChannel = async (user, channel, method) => {
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
			method,
			headers: {
				Accept: "application/vnd.twitchtv.v5+json",

				Authorization: `OAuth ${refreshData.access_token}`,
			},
			body: "",
		});
	} catch (err) {
		log(err.message);
		throw err;
	}
};

router.delete("/follow", validateRequest, async (req, res, next) => {
	const user = req.query.user;
	const channel = req.query.channel;
	try {
		await followChannel(user, channel, "DELETE");
		res.json("success");
	} catch (err) {
		next(err);
	}
});

router.put("/follow", validateRequest, async (req, res, next) => {
	const user = req.query.user;
	const channel = req.query.channel;
	try {
		await followChannel(user, channel, "PUT");
		res.json("success");
	} catch (err) {
		next(err);
	}
});

router.get("/following", async (req, res, next) => {
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
		console.log(response);
		res.json({ message: "success" });
	} catch (err) {
		next(err);
	}
});

router.get("/activechannels", async (req, res, next) => {
	res.json(await TwitchClient.getChannels());
});

router.get("/customemotes", async (req, res, next) => {
	const channelName = req.query.channel || req.query.name;
	if (!channelName) return res.status(400).json({ message: "missing channel name", code: 400 });
	const [bttv, ffz] = await Promise.all([getBttvEmotes(channelName), getFfzEmotes(channelName)]);
	res.json({ bttv, ffz });
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
			console.log("failed to join: ", err);
			let isMod = TwitchClient.isMod(channelName, userName);
			const chatters = await Api.fetch(`https://api.disstreamchat.com/chatters?user=${channelName.substring(1)}`);
			isMod = chatters?.moderators?.includes?.(userName) || isMod;
			TwitchClient.part(channelName);
			if (isMod) {
				return res.json(await Api.getUserInfo(channelName.substring(1)));
			}
		} catch (err) {
			console.log(err, err.message);
			TwitchClient.part(channelName);
			return res.status(500).json(null);
		}
	}
	res.json(null);
});

router.get("/profilepicture", async (req, res, next) => {
	try {
		const user = req.query.user;
		const profilePicture = await getProfilePicture("twitch", user);
		res.json(profilePicture);
	} catch (err) {
		next(err);
	}
});

router.get("/token/refresh", validateRequest, async (req, res, next) => {
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

module.exports = router;
