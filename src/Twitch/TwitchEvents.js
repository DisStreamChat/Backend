require("dotenv").config();
const TwitchApi = require("twitchio-js");
const sha1 = require("sha1");
const uuidv1 = require("uuidv1");
const TPS = require("twitchps");

// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { formatMessage } = require("../utils/messageManipulation");

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

// TODO: move to firebase db
const ranks = require("../ranks.json");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// intialize the twitch api class from the twitch-lib package

const Api = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationKey: process.env.TWITCH_ACCESS_TOKEN,
});

const CommandHandler = require("./CommandHandler");
const { hoursToMillis } = require("../utils/functions");

const DisTwitchChatProfile =
	"https://media.discordapp.net/attachments/710157323456348210/710185505391902810/discotwitch_.png?width=100&height=100";

const getBadges = async (channelName, tags) => {
	// get custom badges from twitch api

    const badges = {};
	if (tags.badges) {
        const userInfo = await Api.getUserInfo(channelName, true)
		const channelBadgeJSON = await Api.getBadgesByUsername(channelName);
		const globalBadges = await Api.getGlobalBadges();

		// TODO: improve by doing channel badges first

		// get all global badges
		for (let [key, value] of Object.entries(tags.badges)) {
			if (key === "subscriber") value = 0; // global subscriber badges only have two keys 0 and 1. 0 is for any subscriber above 1 month

			let badgeInfo = globalBadges[key].versions[value];
			if (badgeInfo) {
				const badgeImage = badgeInfo[`image_url_1x`];
				const badgeTitle = badgeInfo["title"];
				badges[key] = { image: badgeImage, title: badgeTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("subscriber") && tags.badges.subscriber != undefined) {
			const customSubBadges = channelBadgeJSON.subscriber.versions;
			const subLevel = tags.badges.subscriber;
			if (customSubBadges.hasOwnProperty(subLevel)) {
				const subBadge = customSubBadges[subLevel][`image_url_1x`];
				const subTitle = customSubBadges[subLevel]["title"];
				badges["subscriber"] = { image: subBadge, title: subTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("bits") && tags.badges.bits != undefined) {
			const customCheerBadges = channelBadgeJSON.bits.versions;
			const cheerLevel = tags.badges.bits;
			if (customCheerBadges.hasOwnProperty(cheerLevel)) {
				const cheerBadge = customCheerBadges[cheerLevel][`image_url_1x`];
				const customCheerTitle = customCheerBadges[cheerLevel]["title"];
				badges["bits"] = { image: cheerBadge, title: customCheerTitle };
			}
		}
	}
	return badges;
};

module.exports = (TwitchClient, io, app) => {
	TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		// don't waste time with all the next stuff if there isn't a socket connection to that channel
		// // if (!io.hasOwnProperty(channelName)) return;

		// send a message to all connected io for this channel to delete that message
		io.in(`twitch-${channelName}`).emit("deletemessage", tags["target-msg-id"]);
	});

	TwitchClient.on("ban", (channel, username, reason, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		// // if (!io.hasOwnProperty(channelName)) return;
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	TwitchClient.on("timeout", (channel, username, reason, duration, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		// // if (!io.hasOwnProperty(channelName)) return;
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	TwitchClient.on("raided", async (channel, username, viewers) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;
		const theMessage = `${username} has raided with ${viewers} viewer${viewers > 1 ? "s" : ""}`;
		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "raid",
			uuid: uuidv1(),
			id: uuidv1(),
			badges: {},
			sentAt: Date.now(),
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	// currently doesn't work
	TwitchClient.on("hosted", async (channel, username, viewers, autohost) => {
		if (autohost) return;
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;
		const theMessage = `${username} is hosting with ${viewers} viewer${viewers > 1 ? "s" : ""}`;
		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "raid",
			uuid: uuidv1(),
			id: uuidv1(),
			badges: {},
			sentAt: Date.now(),
			userColor: "#ff0029",
		};
		if (messageObject.body.length <= 0) return;
		const _ = [...io[channelName]].forEach(async s => await s.emit("chatmessage", messageObject));
	});

	TwitchClient.on("message", async (channel, tags, message, self) => {
		// Ignore echoed messages and commands.
		if (!["chat", "action"].includes(tags["message-type"])) return;

		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		if (channelName === "dav1dsnyder404") {
			CommandHandler(message, TwitchClient, channelName);
		}

		// don't waste time with all the next stuff if there isn't a socket connection to that channel
		// // if (!io.hasOwnProperty(channelName)) return;
		// console.log(io?.io?.clients?.(`twitch-${channelName}`))

		// get all possible versions of the message with all variations of the message filters
		// const plainMessage = await formatMessage(message, "twitch", tags);
		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, channelName });
		// const censoredMessage = await formatMessage(message, "twitch", tags, { censor: true });
		// const HTMLCensoredMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, censor: true });

		// get all badges for the user that sent the messages put them in an object
		const badges = await getBadges(channelName, tags);

		// TODO: improve
		// append a badge if there is a developer
		if (ranks.twitch.developers.includes(tags["user-id"])) {
			badges["developer"] = {
				image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
				title: "DisStreamchat Staff",
			};
		}
		// the messageId is currently only used for higlighted messages
		let messageId = tags["msg-id"] || "";

		// ping the twitch api for user data, currently only used for profile picture
		const userData = await Api.getUserInfo(tags.username);

		// this is all the data that gets sent to the frontend
		const messageObject = {
			displayName: tags["display-name"],
			avatar: userData.profile_image_url, // long term TODO: look into caching profile picture
			body: HTMLCleanMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "twitch",
			messageId: messageId,
			uuid: tags.id, // TODO: remove
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: tags.color,
			messageType: tags["message-type"],
			replyParentDisplayName: tags["reply-parent-display-name"] || "",
			replyParentMessageBody: tags["reply-parent-msg-body"] || "",
			replyParentMessageId: tags["reply-parent-msg-id"] || "",
			replyParentMessageUserId: tags["reply-parent-user-id"] || "",
		};

		if (messageObject.body.length <= 0) return;

		// send the message object to all io connected to this channel
		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
		try{
			await admin.firestore().collection("messages").doc(channelName).set({messages: true})
			await admin.firestore().collection("messages").doc(channelName).collection("messages").doc(tags.id).set(messageObject)
		}catch(err){
			console.log(err.message)
		}
	});

	let globalCheerMotes = [];
	const getGlobalCheerMotes = async () => {
		globalCheerMotes = (await Api.fetch(`https://api.twitch.tv/helix/bits/cheermotes`)).data;
	};

	const CustomCheerMotes = {};
	const getCustomCheerMotes = async () => {
		const streamersRef = await admin.firestore().collection("Streamers").get();
		const streamers = streamersRef.docs.map(doc => doc.data());
		const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
		for (const name of twitchNames) {
			try {
				const userInfo = await Api.getUserInfo(name);
				if (userInfo && userInfo.id) {
					const userCheerMotes = (await Api.fetch(`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${userInfo.id}`))
						.data;
					const userCustomEmotes = userCheerMotes.filter(
						cheerMote => !globalCheerMotes.find(globalCheerMote => cheerMote.prefix === globalCheerMote.prefix)
					);
					if (userCustomEmotes.length) {
						CustomCheerMotes[name] = userCustomEmotes;
					}
				}
			} catch (err) {
				console.log(err.message);
			}
		}
	};

	let globalCheerMoteID = 0,
		customCheerMoteID = 0;

	const getAllCheerMotes = async () => {
		console.log("getting cheerMotes");
		await getGlobalCheerMotes();
		await getCustomCheerMotes();
		clearInterval(customCheerMoteID);
		clearInterval(globalCheerMoteID);
		customCheerMoteID = setInterval(getCustomCheerMotes, hoursToMillis(4));
		globalCheerMoteID = setInterval(getGlobalCheerMotes, hoursToMillis(24));
	};
	getAllCheerMotes();

	TwitchClient.on("cheer", async (channel, tags, message, self) => {
		const channelName = channel.slice(1).toLowerCase();
		// TODO: improve Regex
		// TODO: improve by splitting by spaces
		const cheerMoteRegex = /([0-9]*[a-zA-Z]*)([0-9]*)/gi;

		// // if (!io.hasOwnProperty(channelName)) return;

		const badges = {};

		let cheerMotes = [...globalCheerMotes];
		if (cheerMotes.length === 0) {
			await getAllCheerMotes();
			cheerMotes = [...globalCheerMotes];
		}
		if (CustomCheerMotes[channelName]) {
			cheerMotes = [...CustomCheerMotes[channelName], ...cheerMotes];
		}

		const cheerMatches = [...message.matchAll(cheerMoteRegex)];
		const cheerMoteMatches = cheerMatches.map(match => ({
			bits: +match[2],
			...cheerMotes.find(cheer => cheer.prefix.toLowerCase() === match[1].toLowerCase()),
		}));

		const cheerMoteMatchTiers = cheerMoteMatches
			.map(cheerMote => {
				const tiers = cheerMote.tiers;
				const bits = cheerMote.bits;
				if (!tiers || !bits || !cheerMote.prefix) return;
				const cheeredTier = tiers.reduce((acc, tier) => (tier["min_bits"] <= bits ? tier : acc));
				return {
					prefix: cheerMote.prefix,
					id: cheerMote.prefix.toLowerCase() + bits,
					tier: cheeredTier,
					image: cheeredTier.images.dark.animated["4"],
					bits,
				};
			})
			.filter(c => !!c);

		let bits = tags.bits;

		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, channelName });

		HTMLCleanMessage = HTMLCleanMessage.replace(cheerMoteRegex, (match, prefix, number) => {
			const cheerMote = cheerMoteMatchTiers.find(cheer => cheer.id == match.toLowerCase());
			if (!cheerMote) return match;
			return `<img src="${cheerMote.image}" title="${cheerMote.prefix}" class="emote">${number}`;
		});

		const theMessage = `${tags["display-name"]} cheered ${bits} bit${bits > 1 ? "s" : ""}!\n${HTMLCleanMessage}`;

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "cheer",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			bits, // << added this to the messageObject
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	TwitchClient.on("anongiftpaidupgrade", async (channel, username, sender, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;

		const badges = {};

		const theMessage = `${username}, is continuing their gift sub! (Originally from Anonymous)`;

		//let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, {	HTMLClean: true, });

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`).emit("twitchanonupgrade", messageObject);
	});

	const subTypes = {
		2000: "Tier 2",
		3000: "Tier 3",
	};

	TwitchClient.on("giftpaidupgrade", async (channel, username, sender, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;

		const badges = {};

		const theMessage = `${username}, is continuing their gift sub! (Originally from ${sender}).`;

		//let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, {HTMLClean: true,});

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`)("chatmessage", messageObject);
	});

	let giftTimeout = null;
	let lastGifter = "";
	let lastGiftAmount = 0;
	let allRecipients = ``;

	TwitchClient.on("subgift", async (channel, username, streakMonths, recipient, { prime, plan, planName }, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;

		const badges = {};

		if (username == lastGifter) {
			clearTimeout(giftTimeout);
			lastGiftAmount++;
			allRecipients += `, @${recipient}`;
		} else {
			lastGifter = username;
			lastGiftAmount = 1;
			allRecipients = `@${recipient}`;
		}
		giftTimeout = setTimeout(async () => {
			let theMessage = ``;

			if (subTypes[plan]) {
				theMessage = `${username} has gifted ${lastGiftAmount} ${subTypes[plan]} subscription(s) to ${allRecipients}!`;
			} else {
				theMessage = `${username} has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`;
			}

			const messageObject = {
				displayName: "DisStreamChat",
				avatar: DisTwitchChatProfile,
				body: theMessage,
				platform: "twitch",
				messageId: "subscription",
				uuid: tags.id,
				id: tags.id,
				badges,
				sentAt: +tags["tmi-sent-ts"],
				userColor: "#ff0029",
			};

			io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);

			lastGiftAmount = 0;
			allRecipients = ``;
		}, 1500);
	});

	TwitchClient.on("resub", async (channel, username, months, message, tags, { prime, plan, planName }) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;

		const badges = {};

		let theMessage = "";

		let cumulativeMonths = ~~tags["msg-param-cumulative-months"];

		if ((tags["msg-param-should-share-streak"] = true)) {
			if (prime) {
				theMessage = `Thanks for the Twitch Prime re-sub for ${cumulativeMonths} months @${username}!`;
			} else if (subTypes[plan]) {
				theMessage = `Thanks for the ${subTypes[plan]} resub for ${cumulativeMonths} months @${username}!`;
			} else {
				theMessage = `Thanks for the resub for ${cumulativeMonths} months @${username}!`;
			}
		} else {
			if (prime) {
				theMessage = `Thanks for the Twitch Prime re-sub @${username}!`;
			} else if (subTypes[plan]) {
				theMessage = `Thanks for the ${subTypes[plan]} resub @${username}!`;
			} else {
				theMessage = `Thanks for the resub @${username}!`;
			}
		}

		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true });

		theMessage += `\n${HTMLCleanMessage}`;

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	TwitchClient.on("subscription", async (channel, username, { prime, plan, planName }, msg, tags) => {
		const channelName = channel.slice(1).toLowerCase();

		let messageId = tags["msg-id"] || "";

		const badges = {};

		let theMessage = "";
		if (prime) {
			theMessage = `Thanks for subscribing with Twitch Prime @${username}!`;
		} else if (subTypes[plan]) {
			theMessage = `Thanks for the ${subTypes[plan]} subscription @${username}!`;
		} else {
			theMessage = `Thanks for subscribing @${username}!`;
		}

		let HTMLCleanMessage = await formatMessage(msg || "", "twitch", tags, { HTMLClean: true });

		theMessage += `\n${HTMLCleanMessage}`;

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		if (messageObject.body.length <= 0) return;
		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	TwitchClient.on("primepaidupgrade", async (channel, username, { prime, plan, planName }, tags) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;

		let messageId = tags["msg-id"] || "";

		const badges = {};

		let theMessage = "";
		if (subTypes[plan]) {
			theMessage = `@${username} has upgraded from a Twitch Prime Sub to a  ${subTypes[plan]} subscription!`;
		} else {
			theMessage = `@${username} has upgraded from a Twitch Prime to a Tier 1 subscription!`;
		}

		//let HTMLCleanMessage = await formatMessage(theMessage, "twitch", tags, { HTMLClean: true });

		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisTwitchChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		if (messageObject.body.length <= 0) return;
		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	// const notifiedStreams = require("../notifiedStreams.json");
	// TODO: move to separate file
	app.post("/webhooks/twitch", async (req, res, next) => {
		try {
			if (req.twitch_hub && req.twitch_hex == req.twitch_signature) {
				const type = req.query.type;
				const data = req.body.data;
				if (!type) return res.json({ message: "missing type", code: 400 });
				if (!data) return res.json({ message: "missing data", code: 400 });
				if (type === "follow") {
					if (data) {
						const body = data[0];
						const streamer = body.to_name.toLowerCase();
						const follower = body.from_name;
						const followerId = body.from_id;
						const followedAt = body.followed_at;

						console.log(`${follower} followed ${streamer}`);

						// long term TODO: add follower count/goal overlay

						const streamerDatabaseId = sha1(body.to_id);

						const db = admin.firestore();
						const streamerRef = await db.collection("Streamers").doc(streamerDatabaseId).get();
						const streamerData = streamerRef.data();
						const previouslyNotified = streamerData.previouslyNotified || [];

						if (new Set(previouslyNotified).has(followerId)) return res.status(200).json("already notified");
						console.log("notifying");
						previouslyNotified.push(followerId);
						await db.collection("Streamers").doc(streamerDatabaseId).update({
							previouslyNotified,
						});

						const badges = {};

						// TODO add custom message handler in seperate file
						const theMessage = `Thanks for following ${follower}!`;

						const messageObject = {
							displayName: "DisStreamChat",
							avatar: DisTwitchChatProfile,
							body: theMessage,
							platform: "twitch",
							messageId: "follow",
							uuid: uuidv1(),
							id: uuidv1(),
							badges,
							sentAt: new Date(followedAt).getTime(),
							userColor: "#ff0029",
						};

						io.in(`twitch-${streamer}`).emit("chatmessage", messageObject);
						setTimeout(() => {
							TwitchClient.join(streamer).catch();
						}, 1000);
					}
					res.json("success");
				} 
			} else {
				// it's not from twitch
				res.status("401").json({ message: "Looks like You aren't twitch" });
			}
		} catch (err) {
			console.log(err.messages);
			res.json({ message: "an error occured" });
		}
	});

	// TODO: refactor so it doesn't fire on follow
	// get channel point redemptions for each channel
	let pubsubbedChannels = [];
	(async () => {
		admin
			.firestore()
			.collection("live-notify")
			.onSnapshot(async snapshot => {
				const allNotifyingChannels = [
					...new Set(
						(await Promise.all(snapshot.docs.map(async doc => await doc.data().channels))).reduce((acc, cur) => [
							...acc,
							...cur,
						])
					),
				].filter(channel => !pubsubbedChannels.find(subChannel => subChannel.id === channel));
				for(const channel of allNotifyingChannels){
                    const streamerData = await Api.getUserInfo(channel)
                    // console.log(streamerData, channel)
					const init_topics = [
						{
							topic: `video-playback.${streamerData.login}`,
						},
                    ];
                    const pubSub = new TPS({
						init_topics,
						reconnect: false,
						debug: false,
					});
					pubSub.channelName = streamerData.login;
                    pubsubbedChannels.push({ listener: pubSub, id: channel });
                    pubSub.on("stream-up", async data => {
						const name = "dscnotifications";
						// console.log(data);
						// if (!io.hasOwnProperty(name)) return;
						console.log("notifications");
						const intervalId = setInterval(async () => {
							console.log("fetching stream");
							const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${data.channel_name}`;
							const streamDataResponse = await Api.fetch(apiUrl);
							const streamData = streamDataResponse.data;
							const stream = streamData[0];
							if (stream) {
								clearInterval(intervalId);
								io.in(`twitch-${name}`).emit("stream-up", { stream, ...data });
							}
						}, 60000);
						// send notifications
					});
				};
			});
		admin
			.firestore()
			.collection("Streamers")
			.onSnapshot(async allStreamersRef => {
				const allStreamersTwitchData = (
					await Promise.all(allStreamersRef.docs.map(async doc => await doc.ref.collection("twitch").doc("data").get()))
				).map(doc => doc.data());
				const authorizedStreamers = allStreamersTwitchData
					.filter(s => s)
					.filter(streamer => !pubsubbedChannels.find(subChannel => subChannel.id === streamer.user_id && subChannel.isUser));
				console.log("Authorized Streamers: ", authorizedStreamers.length);
				authorizedStreamers.forEach(async streamer => {
					if (!streamer.user_id) return;
					const streamerData = await Api.getUserInfo(streamer.user_id);
					const res = await fetch(
						`https://api.disstreamchat.com/twitch/token/refresh/?token=${streamer.refresh_token}&key=${process.env.DSC_API_KEY}`
					);
					const json = await res.json();
					const access_token = json.access_token;
					if (!json.scope?.includes?.("channel:moderate")) return;
					const init_topics = [
						{
							topic: `channel-points-channel-v1.${streamer.user_id}`,
							token: access_token,
						},
						{
							topic: `chat_moderator_actions.${streamer.user_id}`,
							token: access_token,
						},
					];
					const pubSub = new TPS({
						init_topics,
						reconnect: false,
						debug: false,
					});
					pubSub.channelName = streamerData.login;
					pubsubbedChannels.push({ listener: pubSub, id: streamer.user_id, isUser: true });
					pubSub.on("stream-up", async data => {
						const name = "dscnotifications";
						// console.log(data);
						// if (!io.hasOwnProperty(name)) return;
						console.log("notifications");
						const intervalId = setInterval(async () => {
							console.log("fetching stream");
							const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${data.channel_name}`;
							const streamDataResponse = await Api.fetch(apiUrl);
							const streamData = streamDataResponse.data;
							const stream = streamData[0];
							if (stream) {
								clearInterval(intervalId);
								io.in(`twitch-${name}`).emit("stream-up", { stream, ...data });
							}
						}, 60000);
						// send notifications
					});
					pubSub.on("channel-points", async data => {
						try {
							const { redemption, channel_id } = data;
							const user = await Api.getUserInfo(channel_id);
							const channelName = user.login;
							// if (!io.hasOwnProperty(channelName)) return;
							let message = `${redemption.user.display_name || redemption.user.login} has redeemed: ${
								redemption.reward.title
							} `;
							if (redemption.reward.prompt.length > 0) {
								message = `${message} - ${redemption.reward.prompt}`;
							}
							const id = uuidv1();
							const messageObject = {
								displayName: "DisStreamChat",
								avatar: DisTwitchChatProfile,
								body: message,
								platform: "twitch",
								messageId: "subscription",
								messageType: "channel-points",
								uuid: id,
								id,
								badges: {},
								sentAt: new Date().getTime(),
								userColor: "#ff0029",
							};
							io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
						} catch (error) {
							console.log("error sending redemption message", data, error.message);
						}
					});
					pubSub.on("automod_rejected", async data => {
						try {
							const { channelName } = pubSub;
							// if (!io.hasOwnProperty(channelName)) return;

							const theMessage = await formatMessage(data.message, "twitch", {}, { HTMLClean: true });
							const id = uuidv1();
							const messageObject = {
								displayName: "AutoMod",
								avatar: DisTwitchChatProfile,
								body: theMessage,
								platform: "twitch",
								messageId: "",
								messageType: "auto-mod-reject",
								uuid: id,
								id,
								badges: {},
								sentAt: new Date().getTime(),
								userColor: "#ff0029",
								...data,
							};
							io.in(`twitch-${channelName}`).emit("auto-mod", messageObject);
						} catch (error) {
							console.log("error sending automod message", data, error.message);
						}
					});

					pubSub.on("approved_automod_message", data => {
                        const { channelName } = pubSub;
                        io.in(`twitch-${channelName}`).emit("remove-auto-mod", data);
						// console.log("Mod", data.created_by);
						// console.log("Mod ID", data.created_by_user_id);
						// console.log("Approved MessageID", data.message_id);
						// console.log("TargetUser", data.target_user_login);
						// console.log("TargetUserID", data.target_user_id);
					});

					pubSub.on("denied_automod_message", data => {
                        const { channelName } = pubSub;
                        io.in(`twitch-${channelName}`).emit("remove-auto-mod", data);
						// console.log("Mod", data.created_by);
						// console.log("Mod ID", data.created_by_user_id);
						// console.log("Denied MessageID", data.message_id);
						// console.log("TargetUser", data.target_user_login);
						// console.log("TargetUserID", data.target_user_id);
					});

					pubSub.on("add_blocked_term", data => {
						console.log("Mod", data.created_by);
						console.log("ModID", data.created_by_user_id);
						console.log("Added Blocked Term", data.approved_term);
					});

					pubSub.on("delete_blocked_term", data => {
						console.log("Mod", data.created_by);
						console.log("ModID", data.created_by_user_id);
						console.log("Deleted Blocked Term", data.blocked_term);
					});

					pubSub.on("add_permitted_term", data => {
						console.log("Mod", data.created_by);
						console.log("ModID", data.created_by_user_id);
						console.log("Added Permitted Term", data.approved_term);
					});

					pubSub.on("delete_permitted_term", data => {
						console.log("Mod", data.created_by);
						console.log("ModID", data.created_by_user_id);
						console.log("Deleted Permitted Term", data.blocked_term);
					});
				});
			});
	})();
};
