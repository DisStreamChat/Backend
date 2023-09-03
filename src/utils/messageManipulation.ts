import linkifyUrls from "linkify-urls";

import { emoteCacher } from "../Twitch/emoteCacher";
import { escapeRegexSpecialCharacters } from "../utils/functions";

const customEmojiRegex = /&lt;(([a-z])?:[\w]+:)([\d]+)&gt;/gim;
const channelMentionRegex = /<#(\d+)>/gm;
const mentionRegex = /<@([\W\S])([\d]+)>/gm;
const HTMLStripRegex = /<[^:>]*>/gm;

function getBttvUrl(emoteSet: Record<string, string>, name: string): string {
	return `<img src="https://cdn.betterttv.net/emote/${emoteSet[name]}/2x#emote" class="emote" alt="${name}" title=${name}>`;
}

function getFfzUrl(emoteSet: Record<string, string>, name: string): string {
	return `<img src="${emoteSet[name]}#emote" class="emote" title=${name}>`;
}

function getDiscordEmoteUrl(part1: string, part2: string, part3: string) {
	return `<img alt="${part2 ? part1.slice(1) : part1}" title="${
		part2 ? part1.slice(1) : part1
	}" class="emote" src="https://cdn.discordapp.com/emojis/${part3}.${part2 ? "gif" : "png"}?v=1">`;
}

function getTwitchEmoteUrl(id: string) {
	return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;
}

function escapeHtml(dirty: string): string {
	return dirty
		.replace(/(<)([^<]*)(>)/g, "&lt;$2&gt;")
		.replace(/<([a-z])/gi, "&lt;$1")
		.replace(/([a-z])>/gi, "$1&gt;");
}

export const formatMessage = async (
	message: string,
	platform: "discord" | "twitch",
	tags,
	{ HTMLClean, channelName }: { HTMLClean?: boolean; channelName?: string } = {}
) => {
	let dirty = message.slice();
	if (HTMLClean) dirty = linkifyUrls(escapeHtml(dirty));
	if (tags.emotes && platform === "twitch") {
		dirty = replaceTwitchEmotes(dirty, message, tags.emotes);
	}

	// TODO: allow twitch emotes on discord and discord emotes on twitch
	const cachedBTTVEmotes = emoteCacher.bttv.get(channelName);
	const cachedFFZEmotes = emoteCacher.ffz.get(channelName);
	if (platform === "twitch" && channelName && cachedBTTVEmotes && cachedFFZEmotes) {
		const { emotes: bttvEmotes, regex: bttvRegex } = cachedBTTVEmotes;
		const { emotes: ffzEmotes, regex: ffzRegex } = cachedFFZEmotes;
		emoteCacher.invalidate("bttv", channelName);
		emoteCacher.invalidate("ffz", channelName);
		dirty = dirty.replace(bttvRegex, (name: string) => getBttvUrl(bttvEmotes, name));
		dirty = dirty.replace(ffzRegex, (name: string) => getFfzUrl(ffzEmotes, name));
	} else if (platform === "discord") {
		dirty = dirty.replace(customEmojiRegex, (match, part1, part2, part3) => getDiscordEmoteUrl(part1, part2, part3));
	}
	return dirty;
};

export const parseEmotes = (message: string, emotes: Record<string, string[]>) => {
	const emoteEntries = Object.entries(emotes);
	const emoteStartPositionToData = emoteEntries.reduce((starts, [id, emotePositions]) => {
		emotePositions.forEach(startEnd => {
			const [start, end] = startEnd.split("-").map(Number);
			starts[start] = {
				emoteUrl: getTwitchEmoteUrl(id),
				end: end,
			};
		});
		return starts;
	}, {} as Record<number, { emoteUrl: string; end: number }>);

	const messageChars = Array.from(message);
	const emoteImageTags = {};
	let multiUnicodeSymbolsDetected = 0;
	for (let i = 0; i < messageChars.length; i++) {
		// the way array.from works for a string can result in certain characters having a length greater than 1 if they are composed of more than one unicode codepoint.
		// this is relevant because of emojis
		multiUnicodeSymbolsDetected += messageChars[i].length - 1;

		const emoteInfo = emoteStartPositionToData[i];
		if (!emoteInfo) continue;

		const emoteName = message.slice(i + multiUnicodeSymbolsDetected, emoteInfo.end + 1 + multiUnicodeSymbolsDetected);
		emoteImageTags[emoteName] = `<img src="${emoteInfo.emoteUrl}" class="emote" title="${emoteName}">`;
	}
	return emoteImageTags;
};

export const replaceTwitchEmotes = (message, original, emotes) => {
	const emoteNames = parseEmotes(original, emotes);
	for (const name in emoteNames) {
		message = message.replace(new RegExp(`(?<=\\W|^)(${escapeRegexSpecialCharacters(name)})(?=\\W|$)`, "gm"), emoteNames[name]);
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
