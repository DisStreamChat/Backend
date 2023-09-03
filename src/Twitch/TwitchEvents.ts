import express from "express";
// the admin app has already been initialized in routes/index.js
import admin from "firebase-admin";
import sha1 from "sha1";
import Server from "socket.io";
import tmi from "tmi.js";
import uuidv1 from "uuidv1";

import { TwitchMessageModel } from "../models/message.model";
// TODO: move to firebase db
import ranks from "../ranks.json";
import { Duration, setDurationInterval, setDurationTimeout } from "../utils/duration.util";
import { log } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
// get functions used to do things like strip html and replace custom discord emojis with the url to the image
import { formatMessage } from "../utils/messageManipulation";
import { sendMessage } from "../utils/sendMessage";
import CommandHandler from "./CommandHandler";
import pubSub from "./pubsubEvents";

const DisStreamChatProfile =
	"https://media.discordapp.net/attachments/710157323456348210/710185505391902810/discotwitch_.png?width=100&height=100";

const getBadges = async (channelName, tags) => {
	const badges = {};
	if (tags.badges) {
		const channelBadgeJSON = await clientManager.twitchClient.getBadgesByUsername(channelName);
		const globalBadges = await clientManager.twitchClient.getGlobalBadges();

		// TODO: improve by doing channel badges first

		// get all global badges
		for (let [key, value] of Object.entries(tags.badges)) {
			if (key === "subscriber") value = 0; // global subscriber badges only have two keys 0 and 1. 0 is for any subscriber above 1 month

			let badgeInfo = globalBadges[key].versions[value as number];
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

export default (TwitchClient: tmi.Client, io: Server.Server, app: express) => {
	TwitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		io.in(`twitch-${channelName}`).emit("deletemessage", tags["target-msg-id"]);
	});

	TwitchClient.on("ban", (channel, username, reason, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	TwitchClient.on("timeout", (channel, username, reason, duration, userstate) => {
		const channelName = channel.slice(1).toLowerCase();
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	TwitchClient.on("raided", async (channel, username, viewers) => {
		const channelName = channel.slice(1).toLowerCase();
		// if (!io.hasOwnProperty(channelName)) return;
		const theMessage = `${username} has raided with ${viewers} viewer${viewers > 1 ? "s" : ""}`;
		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
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

	TwitchClient.on("message", async (channel, tags, message, self) => {
		// Ignore echoed messages and commands.
		if (!["chat", "action"].includes(tags["message-type"])) return;

		// remove the "#" form the begginning of the channel name
		const channelName = channel.slice(1).toLowerCase();

		if (channelName === "dav1dsnyder404") {
			CommandHandler(message, TwitchClient, channelName);
		}

		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, { HTMLClean: true, channelName });

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
		const userData = await clientManager.twitchClient.getUserInfo(tags.username);

		const messageObject: TwitchMessageModel = {
			displayName: tags["display-name"],
			avatar: userData.profile_image_url, // long term TODO: look into caching profile picture
			body: HTMLCleanMessage,
			platform: "twitch",
			messageId: messageId,
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

		await sendMessage(messageObject, { channel: channelName, platform: "twitch" });
	});

	let globalCheerMotes = [];
	const getGlobalCheerMotes = async () => {
		globalCheerMotes = (await clientManager.twitchClient.fetch(`https://api.twitch.tv/helix/bits/cheermotes`)).data;
	};

	const CustomCheerMotes = {};
	const getCustomCheerMotes = async () => {
		const streamersRef = await admin.firestore().collection("Streamers").get();
		const streamers = streamersRef.docs.map(doc => doc.data());
		const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
		for (const name of twitchNames) {
			try {
				const userInfo = await clientManager.twitchClient.getUserInfo(name);
				if (userInfo && userInfo.id) {
					const userCheerMotes = (
						await clientManager.twitchClient.fetch(`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${userInfo.id}`)
					).data;
					const userCustomEmotes = userCheerMotes.filter(
						cheerMote => !globalCheerMotes.find(globalCheerMote => cheerMote.prefix === globalCheerMote.prefix)
					);
					if (userCustomEmotes.length) {
						CustomCheerMotes[name] = userCustomEmotes;
					}
				}
			} catch (err) {
				log(err.message, { error: true });
			}
		}
	};

	let globalCheerMoteID: any = 0,
		customCheerMoteID: any = 0;

	const getAllCheerMotes = async () => {
		await getGlobalCheerMotes();
		await getCustomCheerMotes();
		clearInterval(customCheerMoteID);
		clearInterval(globalCheerMoteID);
		customCheerMoteID = setDurationInterval(getCustomCheerMotes, Duration.fromHours(4));
		globalCheerMoteID = setDurationInterval(getGlobalCheerMotes, Duration.fromHours(24));
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
			avatar: DisStreamChatProfile,
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
			avatar: DisStreamChatProfile,
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
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: "twitch",
			messageId: "subscription",
			uuid: tags.id,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`).send("chatmessage", messageObject);
	});

	let giftTimeout: NodeJS.Timeout = null;
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
		giftTimeout = setDurationTimeout(async () => {
			let theMessage = ``;

			if (subTypes[plan]) {
				theMessage = `${username} has gifted ${lastGiftAmount} ${subTypes[plan]} subscription(s) to ${allRecipients}!`;
			} else {
				theMessage = `${username} has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`;
			}

			const messageObject = {
				displayName: "DisStreamChat",
				avatar: DisStreamChatProfile,
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
		}, Duration.fromSeconds(1.5));
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
			avatar: DisStreamChatProfile,
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
			avatar: DisStreamChatProfile,
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
			avatar: DisStreamChatProfile,
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

						log(`${follower} followed ${streamer}`);

						// long term TODO: add follower count/goal overlay

						const streamerDatabaseId = sha1(body.to_id);

						const db = admin.firestore();
						const streamerRef = await db.collection("Streamers").doc(streamerDatabaseId).get();
						const streamerData = streamerRef.data();
						const previouslyNotified = streamerData.previouslyNotified || [];

						if (new Set(previouslyNotified).has(followerId)) return res.status(200).json("already notified");
						previouslyNotified.push(followerId);
						await db.collection("Streamers").doc(streamerDatabaseId).update({
							previouslyNotified,
						});

						const badges = {};

						// TODO add custom message handler in seperate file
						const theMessage = `Thanks for following ${follower}!`;

						const messageObject = {
							displayName: "DisStreamChat",
							avatar: DisStreamChatProfile,
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
						setDurationTimeout(() => {
							TwitchClient.join(streamer).catch();
						}, Duration.fromSeconds(1));
					}
					res.json("success");
				}
			} else {
				// it's not from twitch
				res.status("401").json({ message: "Looks like You aren't twitch" });
			}
		} catch (err) {
			log(err.messages, { error: true });
			res.json({ message: "an error occured" });
		}
	});

	// TODO: refactor so it doesn't fire on follow
	// if (process.env.BOT_DEV != "true") {
	pubSub(io);
	// }
};
