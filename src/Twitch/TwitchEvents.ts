import admin from "firebase-admin";
import sha1 from "sha1";
import tmi from "tmi.js";

import { app, io } from "../app";
import { BaseMessageModel, TwitchMessageModel } from "../models/message.model";
// TODO: move to firebase db
import ranks from "../ranks.json";
import { Duration, setDurationInterval, setDurationTimeout } from "../utils/duration.util";
import { exists } from "../utils/exists.util";
import { isNumber, random } from "../utils/functions";
import { log } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
import { formatMessage } from "../utils/messageManipulation";
import { sendMessage } from "../utils/sendMessage";
import CommandHandler from "./CommandHandler";
import pubSub from "./pubsubEvents";

const DisStreamChatProfile =
	"https://media.discordapp.net/attachments/710157323456348210/710185505391902810/discotwitch_.png?width=100&height=100";

function getInfoMessageObject(
	partial: Partial<BaseMessageModel> & {
		type: string;
		id: string;
		body: string;
	}
): BaseMessageModel {
	return {
		displayName: "DisStreamChat",
		avatar: DisStreamChatProfile,
		platform: "twitch",
		sentAt: isNumber(partial.sentAt) ? partial.sentAt : Date.now(),
		userColor: "#ff0029",
		messageType: "action",
		badges: {},
		...partial,
	};
}

function getTwitchIoRoom(channelName: string): string {
	return `twitch-${channelName.replaceAll("#", "").toLowerCase()}`;
}

const getBadges = async (channelName: string, tags: Record<string, any>) => {
	const badges = {};
	if (tags.badges) {
		const channelBadgeJSON = await clientManager.twitchApiClient.getBadgesByUsername(
			channelName
		);
		const globalBadges = await clientManager.twitchApiClient.getGlobalBadges();

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

export default (TwitchClient: tmi.Client) => {
	TwitchClient.on(
		"messagedeleted",
		(channel: string, _username: string, _: unknown, tags: Record<string, any>) => {
			io.in(getTwitchIoRoom(channel)).emit("deletemessage", tags["target-msg-id"]);
		}
	);

	TwitchClient.on("ban", (channel, username) => {
		io.in(getTwitchIoRoom(channel)).emit("purgeuser", username);
	});

	TwitchClient.on("timeout", (channel, username) => {
		io.in(getTwitchIoRoom(channel)).emit("purgeuser", username);
	});

	TwitchClient.on("raided", async (channel, username, viewers) => {
		const messageBody = `${username} has raided with ${viewers} viewer${
			viewers > 1 ? "s" : ""
		}`;
		const messageObject = getInfoMessageObject({
			body: messageBody,
			type: "raid",
			id: random(100000).toString(16),
			badges: {},
			sentAt: Date.now(),
		});

		io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);
	});

	TwitchClient.on("message", async (channel, tags, message) => {
		if (!["chat", "action"].includes(tags["message-type"])) return;

		const channelName = channel.slice(1).toLowerCase();

		if (channelName === "dav1dsnyder404") {
			CommandHandler(message, TwitchClient, channelName);
		}

		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, {
			HTMLClean: true,
			channelName,
		});

		const badges = await getBadges(channelName, tags);

		if (ranks.twitch.developers.includes(tags["user-id"])) {
			badges["developer"] = {
				image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
				title: "DisStreamchat Staff",
			};
		}

		// ping the twitch api for user data, currently only used for profile picture
		const userData = await clientManager.twitchApiClient.getUserInfo(tags.username);

		const messageObject: TwitchMessageModel = {
			displayName: tags["display-name"],
			avatar: userData.profile_image_url, // long term TODO: look into caching profile picture
			body: HTMLCleanMessage,
			// the messageId is currently only used for higlighted messages
			type: tags["msg-id"] || "",
			id: tags.id,
			badges,
			platform: "twitch",
			sentAt: Number(tags["tmi-sent-ts"]),
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
		globalCheerMotes = (
			await clientManager.twitchApiClient.fetch(`https://api.twitch.tv/helix/bits/cheermotes`)
		).data;
	};

	const CustomCheerMotes = {};
	const getCustomCheerMotes = async () => {
		const streamersRef = await admin.firestore().collection("Streamers").get();
		const streamers = streamersRef.docs.map(doc => doc.data());
		const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
		for (const name of twitchNames) {
			try {
				const userInfo = await clientManager.twitchApiClient.getUserInfo(name);
				if (userInfo && userInfo.id) {
					const userCheerMotes = (
						await clientManager.twitchApiClient.fetch(
							`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${userInfo.id}`
						)
					).data;
					const userCustomEmotes = userCheerMotes.filter(
						cheerMote =>
							!globalCheerMotes.find(
								globalCheerMote => cheerMote.prefix === globalCheerMote.prefix
							)
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

	let globalCheerMoteID: NodeJS.Timeout, customCheerMoteID: NodeJS.Timeout;

	const getAllCheerMotes = async () => {
		await getGlobalCheerMotes();
		await getCustomCheerMotes();
		clearInterval(customCheerMoteID);
		clearInterval(globalCheerMoteID);
		customCheerMoteID = setDurationInterval(getCustomCheerMotes, Duration.fromHours(4));
		globalCheerMoteID = setDurationInterval(getGlobalCheerMotes, Duration.fromHours(24));
	};
	getAllCheerMotes();

	TwitchClient.on("cheer", async (channel, tags, message) => {
		const channelName = channel.slice(1).toLowerCase();
		const cheerMoteRegex = /([0-9]*[a-zA-Z]*)([0-9]*)/gi;

		const badges = {};

		let cheerMotes = [...globalCheerMotes];
		if (cheerMotes.length === 0) {
			await getAllCheerMotes();
			cheerMotes = [...globalCheerMotes];
		}

		if (CustomCheerMotes[channelName]) {
			cheerMotes = [...CustomCheerMotes[channelName], ...cheerMotes];
		}

		const cheerMatches = Array.from(message.matchAll(cheerMoteRegex));
		const cheerMoteMatches = cheerMatches.map(([bits, prefix]) => ({
			bits: Number(bits),
			...cheerMotes.find(cheer => cheer.prefix.toLowerCase() === prefix.toLowerCase()),
		}));

		const cheerMoteMatchTiers = cheerMoteMatches
			.map(cheerMote => {
				const tiers: Record<string, any>[] = cheerMote.tiers;
				const bits = cheerMote.bits;
				if (!tiers || !bits || !cheerMote.prefix) return;
				const cheeredTier = tiers.reduce((acc, tier) =>
					tier["min_bits"] <= bits ? tier : acc
				);
				return {
					prefix: cheerMote.prefix,
					id: cheerMote.prefix.toLowerCase() + bits,
					tier: cheeredTier,
					image: cheeredTier.images.dark.animated["4"],
					bits,
				};
			})
			.filter(exists);

		let HTMLCleanMessage = await formatMessage(message, "twitch", tags, {
			HTMLClean: true,
			channelName,
		});

		HTMLCleanMessage = HTMLCleanMessage.replace(cheerMoteRegex, (match, prefix, number) => {
			const cheerMote = cheerMoteMatchTiers.find(cheer => cheer.id == match.toLowerCase());
			if (!cheerMote) return match;
			return `<img src="${cheerMote.image}" title="${cheerMote.prefix}" class="emote">${number}`;
		});

		let bits = Number(tags.bits);
		const messageBody = `${tags["display-name"]} cheered ${bits} bit${
			bits > 1 ? "s" : ""
		}!\n${HTMLCleanMessage}`;

		const messageObject = getInfoMessageObject({
			body: messageBody,
			type: "cheer",
			id: tags.id,
			badges,
			sentAt: Number(tags["tmi-sent-ts"]),
			// bits,
		});

		io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);
	});

	TwitchClient.on(
		"anongiftpaidupgrade" as any,
		async (channel: string, username: string, sender: unknown, tags: Record<string, any>) => {
			const messageBody = `${username}, is continuing their gift sub! (Originally from Anonymous)`;

			const messageObject = getInfoMessageObject({
				body: messageBody,
				type: "subscription",
				id: tags.id,
				sentAt: Number(tags["tmi-sent-ts"]),
			});

			io.in(getTwitchIoRoom(channel)).emit("twitchanonupgrade", messageObject);
		}
	);

	const subTypes = {
		2000: "Tier 2",
		3000: "Tier 3",
	};

	TwitchClient.on("giftpaidupgrade", async (channel, username, sender, tags) => {
		const messageBody = `${username}, is continuing their gift sub! (Originally from ${sender}).`;

		const messageObject = getInfoMessageObject({
			body: messageBody,
			type: "subscription",
			id: tags.id,
			sentAt: Number(tags["tmi-sent-ts"]),
		});

		io.in(getTwitchIoRoom(channel)).send("chatmessage", messageObject);
	});

	let giftTimeout: NodeJS.Timeout = null;
	let lastGifter = "";
	let lastGiftAmount = 0;
	let allRecipients = ``;

	TwitchClient.on(
		"subgift",
		async (channel, username, streakMonths, recipient, { prime, plan, planName }, tags) => {
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
				let messageBody = ``;

				if (subTypes[plan]) {
					messageBody = `${username} has gifted ${lastGiftAmount} ${subTypes[plan]} subscription(s) to ${allRecipients}!`;
				} else {
					messageBody = `${username} has gifted ${lastGiftAmount} subscription(s) to ${allRecipients}!`;
				}

				const messageObject = getInfoMessageObject({
					body: messageBody,
					type: "subscription",
					id: tags.id,
					sentAt: Number(tags["tmi-sent-ts"]),
				});

				io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);

				lastGiftAmount = 0;
				allRecipients = ``;
			}, Duration.fromSeconds(1.5));
		}
	);

	TwitchClient.on(
		"resub",
		async (
			channel: string,
			username: string,
			_months: unknown,
			message: string,
			tags: Record<string, any>,
			{ prime, plan }
		) => {
			let messageBody = "";

			let cumulativeMonths = ~~tags["msg-param-cumulative-months"];

			if ((tags["msg-param-should-share-streak"] = true)) {
				if (prime) {
					messageBody = `Thanks for the Twitch Prime re-sub for ${cumulativeMonths} months @${username}!`;
				} else if (subTypes[plan]) {
					messageBody = `Thanks for the ${subTypes[plan]} resub for ${cumulativeMonths} months @${username}!`;
				} else {
					messageBody = `Thanks for the resub for ${cumulativeMonths} months @${username}!`;
				}
			} else {
				if (prime) {
					messageBody = `Thanks for the Twitch Prime re-sub @${username}!`;
				} else if (subTypes[plan]) {
					messageBody = `Thanks for the ${subTypes[plan]} resub @${username}!`;
				} else {
					messageBody = `Thanks for the resub @${username}!`;
				}
			}

			let HTMLCleanMessage = await formatMessage(message, "twitch", tags, {
				HTMLClean: true,
			});

			messageBody += `\n${HTMLCleanMessage}`;

			const messageObject = getInfoMessageObject({
				body: messageBody,
				type: "subscription",
				id: tags.id,
				sentAt: Number(tags["tmi-sent-ts"]),
			});

			io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);
		}
	);

	TwitchClient.on(
		"subscription",
		async (channel, username, { prime, plan, planName }, msg, tags) => {
			let messageBody = "";
			if (prime) {
				messageBody = `Thanks for subscribing with Twitch Prime @${username}!`;
			} else if (subTypes[plan]) {
				messageBody = `Thanks for the ${subTypes[plan]} subscription @${username}!`;
			} else {
				messageBody = `Thanks for subscribing @${username}!`;
			}

			let HTMLCleanMessage = await formatMessage(msg || "", "twitch", tags, {
				HTMLClean: true,
			});

			messageBody += `\n${HTMLCleanMessage}`;

			const messageObject = getInfoMessageObject({
				body: messageBody,
				type: "subscription",
				id: tags.id,
				sentAt: Number(tags["tmi-sent-ts"]),
			});

			if (messageObject.body.length <= 0) return;
			io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);
		}
	);

	TwitchClient.on(
		"primepaidupgrade",
		async (channel, username, { prime, plan, planName }, tags) => {
			let messageBody = "";
			if (subTypes[plan]) {
				messageBody = `@${username} has upgraded from a Twitch Prime Sub to a  ${subTypes[plan]} subscription!`;
			} else {
				messageBody = `@${username} has upgraded from a Twitch Prime to a Tier 1 subscription!`;
			}

			const messageObject = getInfoMessageObject({
				body: messageBody,
				type: "subscription",
				id: tags.id,
				sentAt: Number(tags["tmi-sent-ts"]),
			});

			if (messageObject.body.length <= 0) return;
			io.in(getTwitchIoRoom(channel)).emit("chatmessage", messageObject);
		}
	);

	// TODO: move to separate file
	app.post("/webhooks/twitch", async (req, res) => {
		const request = req as unknown as Request & {
			twitch_hub: boolean;
			twitch_hex: string;
			twitch_signature: string;
		};
		try {
			if (request.twitch_hub && request.twitch_hex == request.twitch_signature) {
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
						const streamerRef = await db
							.collection("Streamers")
							.doc(streamerDatabaseId)
							.get();
						const streamerData = streamerRef.data();
						const previouslyNotified = streamerData.previouslyNotified || [];

						if (new Set(previouslyNotified).has(followerId))
							return res.status(200).json("already notified");
						previouslyNotified.push(followerId);
						await db.collection("Streamers").doc(streamerDatabaseId).update({
							previouslyNotified,
						});

						const badges = {};

						// TODO add custom message handler in seperate file
						const messageBody = `Thanks for following ${follower}!`;

						const messageObject = getInfoMessageObject({
							body: messageBody,
							type: "follow",
							id: random(100000).toString(16),
							badges,
							sentAt: new Date(followedAt).getTime(),
						});

						io.in(`twitch-${streamer}`).emit("chatmessage", messageObject);
						setDurationTimeout(() => {
							TwitchClient.join(streamer).catch();
						}, Duration.fromSeconds(1));
					}
					res.json("success");
				}
			} else {
				// it's not from twitch
				res.status(401).json({ message: "Looks like You aren't twitch" });
			}
		} catch (err) {
			log(err.messages, { error: true });
			res.json({ message: "an error occured" });
		}
	});

	// TODO: refactor so it doesn't fire on follow
	// if (EnvManager.BOT_DEV != "true") {
	pubSub(io);
	// }
};
