import { JSDOM } from "jsdom";
import URL from "url-parse";
import nodeFetch from "fetchio-js";
import { log } from "./logging";
import { Client, Guild, GuildMember, Message } from "discord.js";

export const warn = (member: GuildMember, guild: Guild, client: Client, message: string) => {};

export const informMods = (message: string, guild: Guild, client: Client) => {};

export const checkDiscordInviteLink = async (url: string): Promise<boolean> => {
	try {
		const response = await nodeFetch(url);
		const text = await response.text();
		const dom = new JSDOM(text).window.document;
		const metaCheck1 = dom.querySelector("[name='twitter:site']");
		const metaCheck2 = dom.querySelector("[property='og:url']");
		return metaCheck1?.content === "@discord" && metaCheck2?.content?.includes("invite");
	} catch (err) {
		log(err.message);
		return false;
	}
};

export const hasDiscordInviteLink = async (urls: string[]): Promise<boolean> => {
	for (const url of urls) {
		if (await checkDiscordInviteLink(url)) {
			return true;
		}
	}
	return false;
};

export const checkBannedDomain = (url: string, domains: string[] = []) => {
	const parsed = new URL(url);
	for (const domain of domains) {
		if (parsed.host.includes(domain)) return true;
	}
	return false;
};

export const hasBannedDomain = (urls: string[], domains: string[] = []) => {
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
