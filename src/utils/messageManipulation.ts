import { firestore } from "firebase-admin";
import linkifyUrls from "linkify-urls";
import cache from "memory-cache";

import { cleanRegex } from "../utils/functions";
import { getBttvEmotes, getFfzEmotes } from "../utils/functions/TwitchFunctions";
import { Duration, setDurationInterval, setDurationTimeout } from "./duration.util";
import { log } from "./functions/logging";

const customEmojiRegex = /&lt;(([a-z])?:[\w]+:)([\d]+)&gt;/gim;
const channelMentionRegex = /<#(\d+)>/gm;
const mentionRegex = /<@([\W\S])([\d]+)>/gm;
const HTMLStripRegex = /<[^:>]*>/gm;

export const getAllEmotes = async () => {
	if (process.env.BOT_DEV == "true") return;
	const streamersRef = await firestore().collection("Streamers").get();
	const streamers = streamersRef.docs.map(doc => doc.data());
	const twitchNames = streamers.map(streamer => streamer.TwitchName).filter(name => name);
	for (const name of twitchNames) {
		try {
			const cachedBTTVEmotes = cache.get("bttv " + name);
			const cachedFFZEmotes = cache.get("ffz " + name);
			if (!cachedBTTVEmotes || (cachedBTTVEmotes && cachedBTTVEmotes.messageSent)) {
				log("refreshing bttv, " + name, { writeToConsole: true });
				cache.put("bttv " + name, { ...(await getBttvEmotes(name)), messageSent: false });
			}
			if (!cachedFFZEmotes || (cachedFFZEmotes && cachedFFZEmotes.messageSent)) {
				log("refreshing ffz, " + name, { writeToConsole: true });
				cache.put("ffz " + name, { ...(await getFfzEmotes(name)), messageSent: false });
			}
		} catch (err) {
			log(err.message);
		}
	}
};
const emoteRefresh = Duration.fromMinutes(10);
setDurationTimeout(() => {
	console.log("starting emote fetch");
	getAllEmotes()
		.then(() => {
			setDurationInterval(getAllEmotes, emoteRefresh);
		})
		.catch(err => {
			log("error getting emotes " + err.message);
			setDurationInterval(getAllEmotes, emoteRefresh);
		});
}, Duration.fromSeconds(10));

export const formatMessage = async (message, platform, tags, { HTMLClean, channelName }: any = {}) => {
	let dirty = message.slice();
	if (HTMLClean)
		dirty = linkifyUrls(
			dirty
				.replace(/(<)([^<]*)(>)/g, "&lt;$2&gt;")
				.replace(/<([a-z])/gi, "&lt;$1")
				.replace(/([a-z])>/gi, "$1&gt;")
		);
	// .replace(urlRegex, `<a href="$&">$&</a>`);
	if (tags.emotes) {
		dirty = replaceTwitchEmotes(dirty, message, tags.emotes);
	}
	// TODO: allow twitch emotes on discord and discord emotes on twitch
	const cachedBTTVEmotes = cache.get("bttv " + channelName);
	const cachedFFZEmotes = cache.get("ffz " + channelName);
	if (platform === "twitch" && channelName && cachedBTTVEmotes && cachedFFZEmotes) {
		const { bttvEmotes, bttvRegex } = cachedBTTVEmotes;
		const { ffzEmotes, ffzRegex } = cachedFFZEmotes;
		cachedBTTVEmotes.messageSent = true;
		cachedFFZEmotes.messageSent = true;
		setDurationTimeout(() => {
			cachedBTTVEmotes.messageSent = false;
			cachedFFZEmotes.messageSent = false;
		}, emoteRefresh.multiply(1.5));
		dirty = dirty.replace(
			bttvRegex,
			name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}" title=${name}>`
		);
		dirty = dirty.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote" title=${name}>`);
	} else if (platform === "discord") {
		dirty = dirty.replace(customEmojiRegex, (match, p1, p2, p3) => {
			return `<img alt="${p2 ? p1.slice(1) : p1}" title="${
				p2 ? p1.slice(1) : p1
			}" class="emote" src="https://cdn.discordapp.com/emojis/${p3}.${p2 ? "gif" : "png"}?v=1">`;
		});
	}
	return dirty;
};

export const parseEmotes = (message, emotes) => {
	const emoteIds = Object.keys(emotes);
	const emoteStart = emoteIds.reduce((starts, id) => {
		emotes[id].forEach(startEnd => {
			const [start, end] = startEnd.split("-").map(Number);
			starts[start] = {
				emoteUrl: `<img src="https://static-cdn.jtvnw.net/emoticons/v1/${id}/3.0" class="emote"`,
				end: end,
			};
		});
		return starts;
	}, {});
	const parts = Array.from(message);
	const emoteNames = {};
	let emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi;
	let emojiDetected = 0;
	for (let i = 0; i < parts.length; i++) {
		const emoteInfo = emoteStart[i];
		emojiDetected += (parts[i] as any).length - 1;
		if (emoteInfo) {
			emoteNames[message.slice(i + emojiDetected, emoteInfo.end + 1 + emojiDetected)] =
				emoteInfo.emoteUrl + ` title="${message.slice(i + emojiDetected, emoteInfo.end + 1 + emojiDetected)}">`;
		}
	}
	return emoteNames;
};

// TODO: fix bugs
export const replaceTwitchEmotes = (message, original, emotes) => {
	const emoteNames = parseEmotes(original, emotes);
	for (let name in emoteNames) {
		message = message.replace(new RegExp(`(?<=\\W|^)(${cleanRegex(name)})(?=\\W|$)`, "gm"), emoteNames[name]);
	}
	return message;
};

export default {
	formatMessage,
	replaceTwitchEmotes,
	customEmojiRegex,
	channelMentionRegex,
	mentionRegex,
	HTMLStripRegex,
};
