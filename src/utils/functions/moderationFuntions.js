const { JSDOM } = require("jsdom");
const URL = require("url-parse");
const { MessageEmbed, MessageAttachment, Permissions } = require("discord.js");
import nodeFetch from "node-fetch";


const warn = (member, guild, client, message) => {};

const informMods = (message, guild, client) => {};

const checkDiscordInviteLink = async url => {
	try {
		const response = await nodeFetch(url);
		const text = await response.text();
		const dom = new JSDOM(text).window.document;
		const metaCheck1 = dom.querySelector("[name='twitter:site']");
		const metaCheck2 = dom.querySelector("[property='og:url']");
		return metaCheck1?.content === "@discord" && metaCheck2?.content?.includes("invite");
	} catch (err) {
		console.log(err.message);
		return false;
	}
};

const hasDiscordInviteLink = async urls => {
	for (const url of urls) {
		if (await checkDiscordInviteLink(url)) {
			return true;
		}
	}
	return false;
};

const checkBannedDomain = (url, domains = []) => {
	const parsed = new URL(url);
	for (const domain of domains) {
		if (parsed?.host?.includes?.(domain)) return true;
	}
	return false;
};

const hasBannedDomain = (urls, domains) => {
	for (const url of urls) {
		if (checkBannedDomain(url, domains)) return true;
	}
	return false;
};

module.exports = {
	warn,
	informMods,
	hasBannedDomain,
	checkBannedDomain,
	hasDiscordInviteLink,
	checkDiscordInviteLink,
};
