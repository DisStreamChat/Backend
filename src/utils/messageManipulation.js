const fetch = require("node-fetch");

const createDOMPurify = require("dompurify");

const { JSDOM } = require("jsdom");

const window = new JSDOM("").window;

const DOMPurify = createDOMPurify(window);
const TwitchApi = require("twitch-lib");
const sha1 = require("sha1");
const admin = require("firebase-admin");

// const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/gm;
const urlRegex = require('url-regex')()
const customEmojiRegex = /&lt;(([a-z])?:[\w]+:)([\d]+)&gt;/gim;
const channelMentionRegex = /<#(\d+)>/gm;
const mentionRegex = /<@([\W\S])([\d]+)>/gm;
const HTMLStripRegex = /<[^:>]*>/gm;

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
	clientId: process.env.TWITCH_CLIENT_ID,
	authorizationToken: process.env.TWITCH_ACCESS_TOKEN,
});

// unused, currently
const replaceMentions = async msg => {
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
const replaceChannelMentions = async msg => {
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
const checkForClash = message => {
	const urlCheck = [...message.matchAll(urlRegex)][0];
	const hasUrl = urlCheck != undefined;
	if (!hasUrl) return;
	const fullUrl = urlCheck[0];
	const codingGameMatch = [...fullUrl.matchAll(/codingame.com\/clashofcode\/clash/g)][0];
	if (codingGameMatch == undefined) return;
	return fullUrl;
};

async function getBttvEmotes(channelName) {
	const bttvEmotes = {};
	let bttvRegex;
	const bttvResponse = await fetch("https://api.betterttv.net/2/emotes");
	let { emotes } = await bttvResponse.json();
	// replace with your channel url
	const bttvChannelResponse = await fetch(`https://api.betterttv.net/2/channels/${channelName}`);
	const { emotes: channelEmotes } = await bttvChannelResponse.json();
	if (channelEmotes) {
		emotes = emotes.concat(channelEmotes);
	}
	let regexStr = "";
	emotes.forEach(({ code, id }, i) => {
		bttvEmotes[code] = id;
		regexStr += code.replace(/\(/, "\\(").replace(/\)/, "\\)") + (i === emotes.length - 1 ? "" : "|");
	});
	bttvRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");

	return { bttvEmotes, bttvRegex };
}

async function getFfzEmotes(channelName) {
	const ffzEmotes = {};
	let ffzRegex;

	const ffzResponse = await fetch("https://api.frankerfacez.com/v1/set/global");
	// replace with your channel url
	const ffzChannelResponse = await fetch(`https://api.frankerfacez.com/v1/room/${channelName}`);
	const { sets } = await ffzResponse.json();
	const { room, sets: channelSets } = await ffzChannelResponse.json();
	let regexStr = "";
	const appendEmotes = ({ name, urls }, i, emotes) => {
		ffzEmotes[name] = `https:${Object.values(urls).pop()}`;
		regexStr += name + (i === emotes.length - 1 ? "" : "|");
	};
	sets[3].emoticons.forEach(appendEmotes);
	if (channelSets && room) {
		const setnum = room.set;
		channelSets[setnum].emoticons.forEach(appendEmotes);
	}
	ffzRegex = new RegExp(`(?<=^|\\s)(${regexStr})(?=$|\\s)`, "g");
	return { ffzEmotes, ffzRegex };
}

const formatMessage = async (message, platform, tags, { HTMLClean, channelName } = {}) => {
	let dirty = message.slice();
	if (HTMLClean)
		dirty = dirty
			.replace(/(<)([^<]*)(>)/g, "&lt;$2&gt;")
			.replace(/<([a-z])/gi, "&lt;$1")
			.replace(/([a-z])>/gi, "$1&gt;");
	dirty = dirty.replace(urlRegex, `<a href="$&">$&</a>`);
	if (tags.emotes) {
        console.log(dirty)
		dirty = replaceTwitchEmotes(dirty, message, tags.emotes);
	}
	// TODO: allow twitch emotes on discord and discord emotes on twitch
	if (platform === "twitch" && channelName) {
		const info = await Api.getUserInfo(channelName);
		if (info) {
			const { id } = info;
			const databaseId = sha1(id);
			const db = admin.firestore();
			const user = await db.collection("Streamers").doc(databaseId).get();
			const userData = user.data();
			const customEmotes = userData.appSettings.ShowCustomEmotes;
			if (customEmotes) {
				// TODO: cache these emotes so we don't have to check them every time and move to frontend
				const { bttvEmotes, bttvRegex } = await getBttvEmotes(channelName);
				const { ffzEmotes, ffzRegex } = await getFfzEmotes(channelName);
				dirty = dirty.replace(
					bttvRegex,
					name => `<img src="https://cdn.betterttv.net/emote/${bttvEmotes[name]}/2x#emote" class="emote" alt="${name}" title=${name}>`
				);
				dirty = dirty.replace(ffzRegex, name => `<img src="${ffzEmotes[name]}#emote" class="emote" title=${name}>`);
			}
		}
	} else if (platform === "discord") {
		dirty = dirty.replace(customEmojiRegex, (match, p1, p2, p3) => {
			return `<img class="emote" src="https://cdn.discordapp.com/emojis/${p3}.${p2 ? "gif" : "png"}?v=1">`;
		});
	}
	return dirty;
};

const cleanRegex = function (str) {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

// TODO: fix bugs
const replaceTwitchEmotes = (message, original, emotes) => {
    const emoteIds = Object.keys(emotes);
    console.log(emotes)
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
    let emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/gi
    let emojiDetected = 0
	for (let i = 0; i < parts.length; i++) {
        const emoteInfo = emoteStart[i];
        if(!![...parts[i].matchAll(emojiRegex)].length){
            emojiDetected ++
        }
		if (emoteInfo) {
			emoteNames[original.slice(i+emojiDetected, emoteInfo.end + 1+emojiDetected)] = emoteInfo.emoteUrl + ` title="${original.slice(i+emojiDetected, emoteInfo.end + 1+emojiDetected)}">`;
		}
    }
    console.log(emoteNames)
	for (let name in emoteNames) {
		message = message.replace(new RegExp(`(?<=\\s|^)(${cleanRegex(name)})(?=\\s|$)`, "gm"), emoteNames[name]);
	}
	return message;
};

module.exports = {
	replaceMentions,
	replaceChannelMentions,
	checkForClash,
	formatMessage,
	replaceTwitchEmotes,
	urlRegex,
	customEmojiRegex,
	channelMentionRegex,
	mentionRegex,
	HTMLStripRegex,
};
