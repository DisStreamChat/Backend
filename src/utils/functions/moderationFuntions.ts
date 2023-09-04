import { JSDOM } from "jsdom";
import nodeFetch from "node-fetch";
import URL from "url-parse";

import { Logger } from "./logging";

export const warn = (member, guild, client, message) => {};

export const informMods = (message, guild, client) => {};

export const checkDiscordInviteLink = async url => {
	try {
		const response = await nodeFetch(url);
		const text = await response.text();
		const dom = new JSDOM(text).window.document;
		const metaCheck1 = dom.querySelector("[name='twitter:site']");
		const metaCheck2 = dom.querySelector("[property='og:url']");
		return metaCheck1?.content === "@discord" && metaCheck2?.content?.includes("invite");
	} catch (err) {
		Logger.error(err.message);
		return false;
	}
};

export const hasDiscordInviteLink = async urls => {
	for (const url of urls) {
		if (await checkDiscordInviteLink(url)) {
			return true;
		}
	}
	return false;
};

export const checkBannedDomain = (url, domains = []) => {
	const parsed = new URL(url);
	for (const domain of domains) {
		if (parsed?.host?.includes?.(domain)) return true;
	}
	return false;
};

export const hasBannedDomain = (urls, domains) => {
	for (const url of urls) {
		if (checkBannedDomain(url, domains)) return true;
	}
	return false;
};

export default {
	warn,
	informMods,
	hasBannedDomain,
	checkBannedDomain,
	hasDiscordInviteLink,
	checkDiscordInviteLink,
};
