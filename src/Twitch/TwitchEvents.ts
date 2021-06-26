import sha1 from "sha1";
import uuidv1 from "uuidv1";

// get functions used to do things like strip html and replace custom discord emojis with the url to the image
import { formatMessage } from "../utils/messageManipulation";

// the admin app has already been initialized in routes/index.js
import admin from "firebase-admin";
import tmi from "tmi.js";

// TODO: move to firebase db
import ranks from "../ranks.json";

import CommandHandler from "./CommandHandler";
import { hoursToMillis } from "../utils/functions";

import { TwitchApiClient as Api } from "../utils/initClients";
import pubSub from "./pubsubEvents";
import { TwitchMessageModel } from "../models/message.model";
import { sendMessage } from "../utils/sendMessage";
import { log } from "../utils/functions/logging";
import { Platform } from "../models/platform.enum";
import { TwitchClient } from "../clients/twitch.client";
import { Object } from "../models/shared.model";
import { transformTwitchUsername } from "../utils/functions/stringManipulation";

const DisStreamChatProfile =
	"https://media.discordapp.net/attachments/710157323456348210/710185505391902810/discotwitch_.png?width=100&height=100";

const getBadges = async (channelName: string, originalBadges: Object) => {
	const badges = {};
	if (originalBadges) {
		const channelBadgeJSON = await Api.getBadgesByUsername(channelName);
		const globalBadges = await Api.getGlobalBadges();

		// TODO: improve by doing channel badges first

		for (let [key, value] of Object.entries(originalBadges)) {
			if (key === "subscriber") value = 0; // global subscriber badges only have two keys 0 and 1. 0 is for any subscriber above 1 month

			let badgeInfo = globalBadges[key].versions[value as number];
			if (badgeInfo) {
				const badgeImage = badgeInfo[`image_url_1x`];
				const badgeTitle = badgeInfo["title"];
				badges[key] = { image: badgeImage, title: badgeTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("subscriber") && originalBadges.subscriber !== undefined) {
			const customSubBadges = channelBadgeJSON.subscriber.versions;
			const subLevel = originalBadges.subscriber;
			if (customSubBadges.hasOwnProperty(subLevel)) {
				const subBadge = customSubBadges[subLevel][`image_url_1x`];
				const subTitle = customSubBadges[subLevel]["title"];
				badges["subscriber"] = { image: subBadge, title: subTitle };
			}
		}

		if (channelBadgeJSON.hasOwnProperty("bits") && originalBadges.bits !== undefined) {
			const customCheerBadges = channelBadgeJSON.bits.versions;
			const cheerLevel = originalBadges.bits;
			if (customCheerBadges.hasOwnProperty(cheerLevel)) {
				const cheerBadge = customCheerBadges[cheerLevel][`image_url_1x`];
				const customCheerTitle = customCheerBadges[cheerLevel]["title"];
				badges["bits"] = { image: cheerBadge, title: customCheerTitle };
			}
		}
	}
	return badges;
};

export default (twitchClient: TwitchClient, io, app) => {
	twitchClient.on("messagedeleted", (channel, username, deletedMessage, tags) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

		io.in(`twitch-${channelName}`).emit("deletemessage", tags["target-msg-id"]);
	});

	twitchClient.on("ban", (channel, username, reason) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	twitchClient.on("timeout", (channel, username, reason, duration) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();
		io.in(`twitch-${channelName}`).emit("purgeuser", username);
	});

	twitchClient.on("raided", async (channel, username, viewers) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();
		const theMessage = `${username} has raided with ${viewers} viewer${viewers > 1 ? "s" : ""}`;
		const messageObject = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "raid",
			uuid: uuidv1(),
			id: uuidv1(),
			badges: {},
			sentAt: Date.now(),
			userColor: "#ff0029",
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});


	twitchClient.on("message", async (channel, tags, message, self) => {
		// Ignore echoed messages and commands.
		if (!["chat", "action"].includes(tags["message-type"])) return;

		
		const channelName = transformTwitchUsername(channel).toLowerCase();
		
		if (channelName === "dav1dsnyder404") {
			CommandHandler(message, twitchClient, channelName);
		}
		let HTMLCleanMessage = await formatMessage(message, Platform.TWITCH, tags, { HTMLClean: true, channelName });
		
		const badges = await getBadges(channelName, tags.badges);
		
		// TODO: improve
		// append a badge if there is a developer
		if (ranks.twitch.developers.includes(tags["user-id"])) {
			badges["developer"] = {
				image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
				title: "DisStreamchat Staff",
			};
		}
		let highlightedMessageId = tags["msg-id"] || "";

		// ping the twitch api for user data, currently only used for profile picture
		const userData = await Api.getUserInfo(tags.username);

		const messageObject: TwitchMessageModel = {
			displayName: tags["display-name"],
			avatar: userData.profile_image_url, // TODO: look into caching profile picture
			body: HTMLCleanMessage,
			platform: Platform.TWITCH,
			highlightedMessageId,
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: tags.color,
			messageType: tags["message-type"],
			type: "chat",
			replyParentDisplayName: tags["reply-parent-display-name"] || "",
			replyParentMessageBody: tags["reply-parent-msg-body"] || "",
			replyParentMessageId: tags["reply-parent-msg-id"] || "",
			replyParentMessageUserId: tags["reply-parent-user-id"] || "",
			channel: channelName
		};

		if (messageObject.body.length <= 0) return;

		await sendMessage(messageObject, { channel: channelName, platform: Platform.TWITCH });
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
		customCheerMoteID = setInterval(getCustomCheerMotes, hoursToMillis(4));
		globalCheerMoteID = setInterval(getGlobalCheerMotes, hoursToMillis(24));
	};
	getAllCheerMotes();

	twitchClient.on("cheer", async (channel, tags, message) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();
		// TODO: improve Regex
		// TODO: improve by splitting by spaces
		const cheerMoteRegex = /([0-9]*[a-zA-Z]*)([0-9]*)/gi;

		let cheerMotes = [...globalCheerMotes];
		if (cheerMotes.length === 0) {
			await getAllCheerMotes();
			cheerMotes = [...globalCheerMotes];
		}
		if (CustomCheerMotes[channelName]) {
			cheerMotes = [...CustomCheerMotes[channelName], ...cheerMotes];
		}

		//@ts-ignore
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

		let bits = +tags.bits;

		let HTMLCleanMessage = await formatMessage(message, Platform.TWITCH, tags, { HTMLClean: true, channelName });

		HTMLCleanMessage = HTMLCleanMessage.replace(cheerMoteRegex, (match, prefix, number) => {
			const cheerMote = cheerMoteMatchTiers.find(cheer => cheer.id == match.toLowerCase());
			if (!cheerMote) return match;
			return `<img src="${cheerMote.image}" title="${cheerMote.prefix}" class="emote">${number}`;
		});

		const theMessage = `${tags["display-name"]} cheered ${bits} bit${bits > 1 ? "s" : ""}!\n${HTMLCleanMessage}`;

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "cheer",
			id: tags.id,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel: channelName
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	twitchClient.on("anongiftpaidupgrade" as any, async (channel: string, username: string, sender: any, tags: any) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

		const theMessage = `${username}, is continuing their gift sub! (Originally from Anonymous)`;

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "subscription",
			id: tags.id,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel: channelName
		};

		io.in(`twitch-${channelName}`).emit("twitchanonupgrade", messageObject);
	});

	const subTypes = {
		2000: "Tier 2",
		3000: "Tier 3",
	};

	twitchClient.on("giftpaidupgrade", async (channel, username, sender, tags) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

		const badges = {};

		const theMessage = `${username}, is continuing their gift sub! (Originally from ${sender}).`;

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "subscription",
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel: channelName
		};

		io.in(`twitch-${channelName}`)("chatmessage", messageObject);
	});

	let giftTimeout = null;
	let lastGifter = "";
	let lastGiftAmount = 0;
	let allRecipients = ``;

	twitchClient.on("subgift", async (channel, username, streakMonths, recipient, { prime, plan, planName }, tags) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

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

			const messageObject: TwitchMessageModel = {
				displayName: "DisStreamChat",
				avatar: DisStreamChatProfile,
				body: theMessage,
				platform: Platform.TWITCH,
				type: "subscription",
				id: tags.id,
				badges,
				sentAt: +tags["tmi-sent-ts"],
				userColor: "#ff0029",
				channel: channelName
			};

			io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);

			lastGiftAmount = 0;
			allRecipients = ``;
		}, 1500);
	});

	twitchClient.on("resub", async (channel, username, months, message, tags, { prime, plan, planName }) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

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

		let HTMLCleanMessage = await formatMessage(message, Platform.TWITCH, tags, { HTMLClean: true });

		theMessage += `\n${HTMLCleanMessage}`;

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "subscription",
			id: tags.id,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel: channelName
		};

		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	twitchClient.on("subscription", async (channel, username, { prime, plan, planName }, msg, tags) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();

		let theMessage = "";
		if (prime) {
			theMessage = `Thanks for subscribing with Twitch Prime @${username}!`;
		} else if (subTypes[plan]) {
			theMessage = `Thanks for the ${subTypes[plan]} subscription @${username}!`;
		} else {
			theMessage = `Thanks for subscribing @${username}!`;
		}

		let HTMLCleanMessage = await formatMessage(msg || "", Platform.TWITCH, tags, { HTMLClean: true });

		theMessage += `\n${HTMLCleanMessage}`;

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "subscription",
			id: tags.id,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel: channelName
		};

		if (messageObject.body.length <= 0) return;
		io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
	});

	twitchClient.on("primepaidupgrade", async (channel, username, { prime, plan, planName }, tags) => {
		const channelName = transformTwitchUsername(channel).toLowerCase();
		const badges = {};

		let theMessage = "";
		if (subTypes[plan]) {
			theMessage = `@${username} has upgraded from a Twitch Prime Sub to a  ${subTypes[plan]} subscription!`;
		} else {
			theMessage = `@${username} has upgraded from a Twitch Prime to a Tier 1 subscription!`;
		}

		const messageObject: TwitchMessageModel = {
			displayName: "DisStreamChat",
			avatar: DisStreamChatProfile,
			body: theMessage,
			platform: Platform.TWITCH,
			type: "subscription",
			id: tags.id,
			badges,
			sentAt: +tags["tmi-sent-ts"],
			userColor: "#ff0029",
			channel
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
							platform: Platform.TWITCH,
							type: "follow",
							uuid: uuidv1(),
							id: uuidv1(),
							badges,
							sentAt: new Date(followedAt).getTime(),
							userColor: "#ff0029",
							channel: streamer
						};

						io.in(`twitch-${streamer}`).emit("chatmessage", messageObject);
						setTimeout(() => {
							twitchClient.join(streamer);
						}, 1000);
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

	pubSub(io);
};
