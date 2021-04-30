import {firestore} from "firebase-admin";
import { cleanRegex } from "../utils/functions";
import cache from "memory-cache";

const customEmojiRegex = /&lt;(([a-z])?:[\w]+:)([\d]+)&gt;/gim;
const channelMentionRegex = /<#(\d+)>/gm;
const mentionRegex = /<@([\W\S])([\d]+)>/gm;
const HTMLStripRegex = /<[^:>]*>/gm;
import  linkifyUrls from "linkify-urls";
import { getFfzEmotes, getBttvEmotes, subscribeToFollowers, initWebhooks } from "../utils/functions/TwitchFunctions";

// unused, currently
export const replaceMentions = async msg => {
	const guild = msg.guild;
	const { members, roles } = guild;
	const mentions = [...msg.content.matchAll(mentionRegex)].map(match => ({ prefix: match[1], id: match[2] }));
	for (const { prefix, id } of mentions) {
		if (prefix === "!") {
			const username = (await members.fetch(id)).user.username;
			msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@" + username);
		} else if (prefix === "&") {
			const name = (await roles.fetch(id)).name;
			msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@" + name);
		}
	}
	return msg;
};

// unused, currently
export const replaceChannelMentions = async msg => {
	const guild = msg.guild;
	const { channels } = guild;
	const mentions = [...msg.content.matchAll(channelMentionRegex)].map(match => match[1]);
	for (const id of mentions) {
		const name = (await channels.resolve(id)).name;
		msg.content = msg.content.replace(new RegExp(`<#${id}>`, "g"), "#" + name);
	}
	return msg;
};

// unused, currently
// export const checkForClash = message => {
// 	const urlCheck = [...message.matchAll(urlRegex)][0];
// 	const hasUrl = urlCheck != undefined;
// 	if (!hasUrl) return;
// 	const fullUrl = urlCheck[0];
// 	const codingGameMatch = [...fullUrl.matchAll(/codingame.com\/clashofcode\/clash/g)][0];
// 	if (codingGameMatch == undefined) return;
// 	return fullUrl;
// };

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
				console.log("refreshing bttv, " + name);
				cache.put("bttv " + name, { ...(await getBttvEmotes(name)), messageSent: false });
			}
			if (!cachedFFZEmotes || (cachedFFZEmotes && cachedFFZEmotes.messageSent)) {
				console.log("refreshing ffz, " + name);
				cache.put("ffz " + name, { ...(await getFfzEmotes(name)), messageSent: false });
			}
		} catch (err) {
			console.log(err.message);
		}
	}
};
const emoteRefresh = 60000 * 10;
setTimeout(() => {
	console.log("starting emote fetch");
	getAllEmotes()
		.then(() => {
			setInterval(getAllEmotes, emoteRefresh);
		})
		.catch(err => {
			console.log("error getting emotes " + err.message);
			setInterval(getAllEmotes, emoteRefresh);
		});
}, emoteRefresh / 50);

export const formatMessage = async (message, platform, tags, { HTMLClean, channelName }:any = {}) => {
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
	console.log(cachedBTTVEmotes, cachedFFZEmotes);
	if (platform === "twitch" && channelName && cachedBTTVEmotes && cachedFFZEmotes) {
		const { bttvEmotes, bttvRegex } = cachedBTTVEmotes;
		const { ffzEmotes, ffzRegex } = cachedFFZEmotes;
		cachedBTTVEmotes.messageSent = true;
		cachedFFZEmotes.messageSent = true;
		setTimeout(() => {
			cachedBTTVEmotes.messageSent = false;
			cachedFFZEmotes.messageSent = false;
		}, emoteRefresh * 1.5);
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
	replaceMentions,
	replaceChannelMentions,
	formatMessage,
	replaceTwitchEmotes,
	customEmojiRegex,
	channelMentionRegex,
	mentionRegex,
	HTMLStripRegex,
};
