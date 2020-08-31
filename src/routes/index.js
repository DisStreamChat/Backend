require("dotenv").config();
import express from "express";
const router = express.Router();
import sha1 from "sha1";
import fetch from "node-fetch";
import TwitchApi from "twitch-lib";
import admin from "firebase-admin";
import DiscordOauth2 from "discord-oauth2";
import { getUserInfo } from "../utils/DiscordClasses";
import { DiscordClient, TwitchClient } from "../utils/initClients";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { UserManager } from "discord.js";

// get the serviceAccount details from the base64 string stored in environment variables
const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationToken: process.env.TWITCH_ACCESS_TOKEN,
});

const oauth = new DiscordOauth2({
	clientId: process.env.DISCORD_CLIENT_ID,
	clientSecret: process.env.DISCORD_CLIENT_SECRET,
	redirectUri: process.env.REDIRECT_URI + "/?discord=true",
});

const subscribeToFollowers = async (channelID, leaseSeconds = 864000) => {
	leaseSeconds = Math.min(864000, Math.max(0, leaseSeconds));
	const body = {
		"hub.callback": "https://api.disstreamchat.com/webhooks/twitch?type=follow&new=true",
		"hub.mode": "subscribe",
		"hub.topic": `https://api.twitch.tv/helix/users/follows?first=1&to_id=${channelID}`,
		"hub.lease_seconds": leaseSeconds,
		"hub.secret": process.env.WEBHOOK_SECRET,
	};
	try {
		const response = await Api.fetch("https://api.twitch.tv/helix/webhooks/hub", {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		});
		if(!response.ok){
			console.log(await response.json())	
		}
	} catch (err) {
		console.log(err.message);
	}

	return leaseSeconds;
};

const subscribeToStreams = async (channelID, leaseSeconds = 864000) => {
	leaseSeconds = Math.min(864000, Math.max(0, leaseSeconds));
	const body = {
		"hub.callback": "https://api.disstreamchat.com/webhooks/twitch?type=stream",
		"hub.mode": "subscribe",
		"hub.topic": `https://api.twitch.tv/helix/streams?user_id=${channelID}`,
		"hub.lease_seconds": leaseSeconds,
		"hub.secret": process.env.WEBHOOK_SECRET,
	};
	try {
		await Api.fetch("https://api.twitch.tv/helix/webhooks/hub", {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (err) {
		console.log(err.message);
	}

	return leaseSeconds;
};

const unsubscribeFromFollowers = async (channelID, leaseSeconds = 864000) => {
	leaseSeconds = Math.min(864000, Math.max(0, leaseSeconds));
	const body = {
		"hub.callback": "https://api.disstreamchat.com/webhooks/twitch?type=follow",
		"hub.mode": "unsubscribe",
		"hub.topic": `https://api.twitch.tv/helix/users/follows?first=1&to_id=${channelID}`,
		"hub.lease_seconds": leaseSeconds,
		"hub.secret": process.env.WEBHOOK_SECRET,
	};
	try {
		await Api.fetch("https://api.twitch.tv/helix/webhooks/hub", {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (err) {
		console.log(err.message);
	}

	return leaseSeconds;
};

let allConnections = [];
admin
	.firestore()
	.collection("webhookConnections")
	.onSnapshot(async snapshot => {
		const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
		console.log("change");
		allConnections = docs.filter(doc => doc.channelId != undefined);
	});

const sevenDays = 604800000;
const tenDays = 8.64e8;

(async () => {
	try {
		const lastConnection = (await admin.firestore().collection("webhookConnections").get()).docs
			.find(doc => doc.id === "lastConnection")
			.data().value;

		const now = new Date().getTime();
		const nextConnectionTime = lastConnection + sevenDays;
		const timeUntilNextConnection = Math.max(nextConnectionTime - now, 0);
		console.log(new Date(new Date().getTime() + timeUntilNextConnection), timeUntilNextConnection);
		const updateConnections = () => {
			const value = new Date().getTime();
			allConnections.forEach(data => {
				const id = data.channelId;
				console.log(id)
                subscribeToFollowers(id, tenDays);
                //subscribeToStreams(id, tenDays)
			});
			admin.firestore().collection("webhookConnections").doc("lastConnection").update({
				value,
			});
		};
		setTimeout(() => {
			updateConnections();
			setInterval(updateConnections, tenDays);
		}, timeUntilNextConnection);
	} catch (err) {
		console.log(err);
	}
})();

const validateRequest = async(req, res, next) => {
    const apiKey = req.query.key
    if(apiKey === process.env.DSC_API_KEY) return next()
    const userId = req.query.id
    const otc = req.query.otc
    const otcData = (await admin.firestore().collection("Secret").doc(userId).get()).data()
    const otcFromDb = otcData?.value
    if(otcFromDb === otc){
        const newOtc = uuidv4()
        await admin.firestore().collection("Secret").doc(userId).set({value: newOtc})
        return next()
    }
    res.status(401).json({message: "Missing or invalid credentials", code: 401})
}

// render the index.html file in the public folder when the /oauth/twitch endpoint is requested
router.use("/oauth/twitch", express.static("public"));

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
		res.json(
			channelManger.cache
				.array()
				.filter(channel => channel.type == "text")
				.map(channel => {
					const parent = channel.parent ? channel.parent.name : "";
					return { id: channel.id, name: channel.name, parent: parent };
				})
		);
	} catch (err) {
		console.log(err);
		res.json([]);
	}
});

router.get("/resolvechannel", async (req, res, next) => {
	const { guild, channel } = req.query;
	const response = await fetch("https://api.distwitchchat.com/getchannels?guild=" + guild);
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

// TODO: add download page
router.get("/app", async (req, res) => {
	const version = req.query.version;
	if (version) {
		return res.redirect(`https://github.com/DisTwitchChat/App/releases/download/v${version}/disstreamchat-Setup-${version}.exe`);
	}
	const apiURL = "https://api.github.com/repos/disstreamchat/App/releases";
	const response = await fetch(apiURL);
	const json = await response.json();
	res.redirect(json[0].assets[0].browser_download_url);
	// const version = req.query.v;
	// if (version) {
	//
	// } else {
	// 	res.redirect(
	// 		`https://firebasestorage.googleapis.com/v0/b/distwitchchat-db.appspot.com/o/disstreamchat%20Setup%201.0.2.exe?alt=media&token=4e928f5e-079a-47ab-b82b-3dba3101038c`
	// 	);
	// }
});

router.get("/discord/token/refresh", validateRequest, async (req, res, next) => {
	try {
		const token = req.query.token;
		const tokenData = await oauth.tokenRequest({
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
		console.log(process.env.REDIRECT_URI + "/?discord=true");
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
			redirectUri: process.env.REDIRECT_URI + "/?discord=true",
		};
		console.log(body);
		const tokenData = await oauth.tokenRequest(body);
		res.json(await getUserInfo(tokenData));
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
	const refreshToken = userTwitchData.refresh_token;
	const response = await fetch(`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}&key=${process.env.DSC_API_KEY}`);
	const json = await response.json();
	const scopes = json.scope;
	if (!scopes.includes("user_subscriptions")) {
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
        channelName = "#"+channelName
    }

	const userName = req.query.user;
	try {
		const inChannels = await TwitchClient.getChannels();
		const alreadyJoined = inChannels.includes(channelName);

        if(!alreadyJoined){
            const userData = await Api.getUserInfo(channelName.substring(1))
            if(userData){
                await TwitchClient.join(channelName)
            }else{
                return res.status(400).json({message: "invalid channel name, it seems like that isn't a twitch channel", code: 400})
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
            const chatters = await Api.fetch(`https://api.disstreamchat.com/chatters?user=${channelName.substring(1)}`)
            isMod = chatters?.moderators?.includes?.(userName) || isMod
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
		const platform = req.query.platform;
		const user = req.query.user;
		let profilePicture;
		console.log(user);
		if (platform === "twitch" || !platform) {
			profilePicture = (await Api.getUserInfo(user))["profile_image_url"];
		} else if (platform === "youtube") {
			// get profile picture from youtube api
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
	const response = await fetch(`https://tmi.twitch.tv/group/user/${req.query.user}/chatters`);
	const json = await response.json();
	let onlineBots = [];
	// try{
	//     const onlineBotsResponse = await fetch("https://api.twitchinsights.net/v1/bots/online")
	//     onlineBots = (await onlineBotsResponse.json()).bots.map(bot => bot[0])
	// }catch(err){

	// }
	let count = 0;
	for (let [key, value] of Object.entries(json.chatters || {})) {
		json.chatters[key] = value.filter(name => !onlineBots.includes(name));
		count += json.chatters[key].length;
	}
	json.chatter_count = count;
	res.json(json);
});

router.get("/stats/twitch", async (req, res, next) => {
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
});

router.get("/webhooks/twitch", async (req, res, next) => {
	console.log(req.query);
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
	console.log(req.query);
	await admin.firestore().collection("oneTimeCodes").doc(req.query.code).set({ authToken: req.query.token });
	res.json("success");
});

router.get("/fonts", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../public/fonts.css"));
});

router.get("/name", (req, res, next) => {
	res.send("DisStreamChat");
});

async function getBttvEmotes(channelName) {
	const bttvEmotes = {};
	let bttvRegex;
	const bttvResponse = await fetch("https://api.betterttv.net/2/emotes");
	let { emotes } = await bttvResponse.json();
	// replace with your channel url
	const bttvChannelResponse = await fetch(`https://api.betterttv.net/2/channels/${channelName}`);
	const { emotes: channelEmotes } = await bttvChannelResponse.json();
	if (channelEmotes) {
		emotes = emotes.concat(channelEmotes);
	}
	let regexStr = "";
	emotes.forEach(({ code, id }, i) => {
		bttvEmotes[code] = id;
		regexStr += code.replace(/\(/, "\\(").replace(/\)/, "\\)") + (i === emotes.length - 1 ? "" : "|");
	});
	bttvRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");

	return { bttvEmotes, bttvRegex };
}

async function getFfzEmotes(channelName) {
	const ffzEmotes = {};
	let ffzRegex;

	const ffzResponse = await fetch("https://api.frankerfacez.com/v1/set/global");
	// replace with your channel url
	const ffzChannelResponse = await fetch(`https://api.frankerfacez.com/v1/room/${channelName}`);
	const { sets } = await ffzResponse.json();
	const { room, sets: channelSets } = await ffzChannelResponse.json();
	let regexStr = "";
	const appendEmotes = ({ name, urls }, i, emotes) => {
		ffzEmotes[name] = `https:${Object.values(urls).pop()}`;
		regexStr += name + (i === emotes.length - 1 ? "" : "|");
	};
	sets[3].emoticons.forEach(appendEmotes);
	if (channelSets && room) {
		const setnum = room.set;
		channelSets[setnum].emoticons.forEach(appendEmotes);
	}
	ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");
	return { ffzEmotes, ffzRegex };
}

router.get("/customemotes", async (req, res, next) => {
	const channelName = req.query.channel || req.query.name;
	if (!channelName) return res.status(400).json({ message: "missing channel name", code: 400 });
	const [bttv, ffz] = await Promise.all([getBttvEmotes(channelName), getFfzEmotes(channelName)]);
	res.json({ bttv, ffz });
});

router.get("/twitch/channels", async (req, res, next) => {
	res.json(await TwitchClient.getChannels());
});

module.exports = router;
