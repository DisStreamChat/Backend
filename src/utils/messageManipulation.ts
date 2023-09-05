import linkifyUrls from "linkify-urls";
import { ChatUserstate, SubUserstate } from "tmi.js";

import { emoteCacher } from "../Twitch/emoteCacher";
import { escapeRegexSpecialCharacters } from "../utils/functions";

const escapedCustomDiscordEmojiRegex = /&lt;([a-z])?:([\w]+):([\d]+)&gt;/gim;

function getBttvUrl(emoteSet: Record<string, string>, name: string): string {
	return `<img src="https://cdn.betterttv.net/emote/${emoteSet[name]}/2x#emote" class="emote" alt="${name}" title=${name}>`;
}

function getFfzUrl(emoteSet: Record<string, string>, name: string): string {
	return `<img src="${emoteSet[name]}#emote" class="emote" title=${name}>`;
}

function getDiscordEmoteUrl(isEmoteAnimated: boolean, emoteName: string, emoteId: string) {
	return `<img alt="${emoteName}" title="${emoteName}" class="emote" src="https://cdn.discordapp.com/emojis/${emoteId}.${
		isEmoteAnimated ? "gif" : "png"
	}?v=1">`;
}

function getTwitchEmoteUrl(id: string) {
	return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;
}

function escapeHtml(dirty: string): string {
	return dirty.replace(/(<)?([^<>]*)(>)?/g, (_match, p1, p2, p3) => {
		return `${p1 ? "&lt;" : ""}${p2}${p3 ? "&gt;" : ""}`;
	});
}

export const formatMessage = async (
	message: string,
	platform: "discord" | "twitch",
	tags: ChatUserstate | SubUserstate,
	{ HTMLClean, channelName }: { HTMLClean?: boolean; channelName?: string } = {}
) => {
	let dirty = HTMLClean ? linkifyUrls(escapeHtml(message)) : message.slice();

	// TODO: allow twitch emotes on discord and discord emotes on twitch
	const cachedBTTVEmotes = emoteCacher.bttv.get(channelName);
	const cachedFFZEmotes = emoteCacher.ffz.get(channelName);
	if (platform === "twitch" && channelName && cachedBTTVEmotes && cachedFFZEmotes) {
		emoteCacher.temporarilyInvalidateAll(channelName);

		if (tags.emotes) {
			dirty = replaceTwitchEmotes(dirty, message, tags.emotes);
		}

		const { emotes: bttvEmotes, regex: bttvRegex } = cachedBTTVEmotes;
		const { emotes: ffzEmotes, regex: ffzRegex } = cachedFFZEmotes;

		dirty = dirty
			.replace(bttvRegex, (name: string) => getBttvUrl(bttvEmotes, name))
			.replace(ffzRegex, (name: string) => getFfzUrl(ffzEmotes, name));
	} else if (platform === "discord") {
		dirty = dirty.replace(
			escapedCustomDiscordEmojiRegex,
			(_match, isEmoteAnimated, emoteName, emoteId) =>
				getDiscordEmoteUrl(!!isEmoteAnimated, emoteName, emoteId)
		);
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
		// the way array.from works for a string can result in certain characters
		// with a length greater than 1 if they are composed of more than one unicode codepoint.
		// this is relevant because of emojis
		multiUnicodeSymbolsDetected += messageChars[i].length - 1;

		const emoteInfo = emoteStartPositionToData[i];
		if (!emoteInfo) continue;

		const emoteName = message.slice(
			i + multiUnicodeSymbolsDetected,
			emoteInfo.end + 1 + multiUnicodeSymbolsDetected
		);
		emoteImageTags[
			emoteName
		] = `<img src="${emoteInfo.emoteUrl}" class="emote" title="${emoteName}">`;
	}
	return emoteImageTags;
};

export const replaceTwitchEmotes = (
	message: string,
	original: string,
	emotes: Record<string, string[]>
) => {
	const emoteNamesToImgTagMap = parseEmotes(original, emotes);
	const namesPattern = Object.keys(emoteNamesToImgTagMap)
		.map(name => escapeRegexSpecialCharacters(name))
		.join("|");

	const regex = new RegExp(`(?<=\\W|^)(${namesPattern})(?=\\W|$)`, "gm");

	return message.replace(regex, match => emoteNamesToImgTagMap[match]);
};

export default {
	formatMessage,
	replaceTwitchEmotes,
};
