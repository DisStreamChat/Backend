const formatDistanceToNow = require("date-fns/formatDistanceToNow");
const { MessageEmbed, MessageAttachment, Permissions } = require("discord.js");
const fs = require("fs");
const path = require("path");
const adminIds = require("../ranks.json");
const Canvas = require("canvas");
const URL = require("url-parse");
import admin from "firebase-admin";
import nodeFetch from "node-fetch";

Canvas.registerFont(path.join(__dirname, "../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });
Canvas.registerFont("./assets/fonts/OpenMoji-Black.ttf", { family: "OpenMoji", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoEmoji-Regular.ttf", { family: "Noto Emoji", weight: "normal", style: "normal" });

// Language Support (Devanagari, Bengali, Tamil, Gujarati and Telugu)
Canvas.registerFont("./assets/fonts/Hind-Regular.ttf", { family: "Hind", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Hind-Bold.ttf", { family: "Hind", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/Hind-Light.ttf", { family: "Hind", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Regular.ttf", { family: "Hind Guntur", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Bold.ttf", { family: "Hind Guntur", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Light.ttf", { family: "Hind Guntur", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Regular.ttf", { family: "Hind Madurai", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Bold.ttf", { family: "Hind Madurai", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Light.ttf", { family: "Hind Madurai", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Regular.ttf", { family: "Hind Siliguri", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Bold.ttf", { family: "Hind Siliguri", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Light.ttf", { family: "Hind Siliguri", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Regular.ttf", { family: "Hind Vadodara", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Bold.ttf", { family: "Hind Vadodara", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Light.ttf", { family: "Hind Vadodara", weight: "light", style: "normal" });

// Language Support (Burmese and Thai)
Canvas.registerFont("./assets/fonts/Kanit-Regular.ttf", { family: "Kanit", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-Italic.ttf", { family: "Kanit", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/Kanit-Bold.ttf", { family: "Kanit", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-BoldItalic.ttf", { family: "Kanit", weight: "bold", style: "italic" });
Canvas.registerFont("./assets/fonts/Kanit-Light.ttf", { family: "Kanit", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-LightItalic.ttf", { family: "Kanit", weight: "light", style: "italic" });
Canvas.registerFont("./assets/fonts/Padauk-Regular.ttf", { family: "Padauk", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Padauk-Bold.ttf", { family: "Padauk", weight: "bold", style: "normal" });

// Language Support (Japanese, Korean and Chinese)
Canvas.registerFont("./assets/fonts/NotoSansJP-Regular.otf", { family: "Noto Sans JP", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansJP-Bold.otf", { family: "Noto Sans JP", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansJP-Light.otf", { family: "Noto Sans JP", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Regular.otf", { family: "Noto Sans KR", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Bold.otf", { family: "Noto Sans KR", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Light.otf", { family: "Noto Sans KR", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Regular.otf", { family: "Noto Sans TC", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Bold.otf", { family: "Noto Sans TC", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Light.otf", { family: "Noto Sans TC", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Regular.otf", { family: "Noto Sans SC", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Bold.otf", { family: "Noto Sans SC", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Light.otf", { family: "Noto Sans SC", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Regular.otf", { family: "Noto Sans HK", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Bold.otf", { family: "Noto Sans HK", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Light.otf", { family: "Noto Sans HK", weight: "light", style: "normal" });

// Main Fonts
Canvas.registerFont("./assets/fonts/whitney-medium.otf", { family: "Whitney", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-mediumitalic.otf", { family: "Whitney", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/whitney-boldsc.otf", { family: "Whitney", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-bolditalicsc.otf", { family: "Whitney", weight: "bold", style: "italic" });
Canvas.registerFont("./assets/fonts/whitney-light.otf", { family: "Whitney", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-lightitalic.otf", { family: "Whitney", weight: "light", style: "italic" });
Canvas.registerFont("./assets/fonts/PTSans-Regular.ttf", { family: "PT Sans", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/PTSans-Italic.ttf", { family: "PT Sans", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/PTSans-Bold.ttf", { family: "PT Sans", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/PTSans-BoldItalic.ttf", { family: "PT Sans", weight: "bold", style: "italic" });

String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

const getRoleIds = user => user.roles.cache.array().map(role => role.id);

const getLevel = xp => Math.max(0, Math.floor(Math.log(xp - 100)));

const getXp = level => (5 / 6) * level * (2 * level * level + 27 * level + 91);

const applyText = (canvas, text) => {
	const ctx = canvas.getContext("2d");

	// Declare a base size of the font
	let fontSize = 70;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${(fontSize -= 10)}px sans-serif`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return ctx.font;
};

const roundRect = function (ctx, x, y, w, h, r = 0) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.fill();
	return ctx;
};

const walkSync = (files, fileDir, fileList = []) => {
	for (const file of files) {
		const absolutePath = path.join(fileDir, file);
		if (fs.statSync(absolutePath).isDirectory()) {
			const dir = fs.readdirSync(absolutePath);
			walkSync(dir, absolutePath, fileList);
		} else {
			fileList.push({ name: file, path: path.relative(__dirname, absolutePath) });
		}
	}
	return fileList;
};

const cleanRegex = function (str) {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

const getHighestRole = roles => roles.reduce((acc, cur) => (acc.rawPosition > cur.rawPosition ? acc : cur));

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0);

const checkOverwrites = (overwrites, perms, admin) => {
	const Allows = new Permissions(overwrites.allow);
	const Deny = new Permissions(overwrites.deny);
	return { allow: Allows.any(perms, admin), deny: !Deny.any(perms, admin) };
};

const hasPermission = async (member, perms, channel, admin) => {
	const guild = member.guild;
	// if(guild.ownerId === member.id) return true
	const hasGlobalPerms = ArrayAny(member.permissions.toArray(), perms);
	let hasPerm = hasGlobalPerms;
	if (channel) {
		const permissionOverwrites = channel?.permissionOverwrites;
		if (!permissionOverwrites) return hasPerm;
		const overWriteRoles = (await Promise.all(permissionOverwrites.keyArray().map(key => guild.roles.fetch(key)))).filter(
			role => role.name !== "@everyone"
		);
		const memberRoles = member.roles.cache.array();
		const memberOverWriteRoles = overWriteRoles.filter(role => memberRoles.find(r => role.id === r.id));
		const highestOverWriteRole = getHighestRole(memberOverWriteRoles);
		const roleOverWrites = permissionOverwrites.get(highestOverWriteRole.id);
		const { allow, deny } = checkOverwrites(roleOverWrites, perms, admin);
		return (hasPerm || allow) && hasPerm && deny;
	}
	return hasPerm;
};

const modWare = async (msg, args, client, permissions, cb, { twitch } = {}) => {
	if (await hasPermission(msg.member, permissions)) {
		await cb(msg, args, client);
	} else {
		await msg.channel.send(
			`❌ you don't have permission to use this command, use ${client?.prefix || ""}help to see available commands`
		);
	}
};

const resolveUser = (msg, username) => {
	const memberCache = msg.guild.members.cache;
	if (/<@!?\d+>/g.test(username)) {
		return memberCache.get(msg.mentions.users.first().id);
	}
	if (memberCache.has(username)) {
		return memberCache.get(username);
	}
	if (/(.*)#(\d{4})/g.test(username)) {
		return memberCache.find(member => member.user.tag === username);
	}
	if (memberCache.find(member => member.nickname === username)) {
		return memberCache.find(member => member.nickname === username);
	}
	if (memberCache.find(member => member.user.username === username)) {
		return memberCache.find(member => member.user.username === username);
	}
	if (memberCache.find(member => member.id === username)) {
		return memberCache.find(member => member.id === username);
	}
	return null;
};

const generateRankCard = async (userData, user) => {
	const canvas = Canvas.createCanvas(700, 250);
	const ctx = canvas.getContext("2d");
	const xpToNextLevel = getXp(userData.level + 1);
	const xpForCurrentLevel = getXp(userData.level);
	const xpLevelDif = Math.abs(xpToNextLevel - xpForCurrentLevel);
	const currentXp = userData.xp;
	const xpProgress = Math.abs(userData.xp - xpForCurrentLevel);
	const percentDone = xpProgress / xpLevelDif;
	ctx.fillStyle = "#1f2525a0";
	roundRect(ctx, 0, 0, canvas.width, canvas.height, 125);
	ctx.fillStyle = "#090b0b";
	const gap = 20;
	roundRect(ctx, gap, gap, canvas.width - gap * 2, canvas.height - gap * 2, 125);

	const barWidth = canvas.width / 1.75;
	const barHeight = 25;

	const bary = 160;
	//xp bar
	ctx.fillStyle = "#484b4e";
	roundRect(ctx, canvas.width / 3, bary, barWidth, barHeight, barHeight / 2);
	ctx.fillStyle = "#c31503";
	roundRect(ctx, canvas.width / 3, bary, Math.max(barWidth * percentDone, barHeight), barHeight, barHeight / 2);

	ctx.font = "24px Poppins";
	ctx.fillStyle = "#ffffff";
	const name = `${user.nickname || user.user.username}${user.user.tag.slice(-5)}`;
	const nameWidth = ctx.measureText(name).width;
	if (nameWidth > canvas.width * 0.75) {
		ctx.font = "16px Poppins";
	}
	ctx.fillText(`${name}`, canvas.width / 3, 100);
	ctx.strokeStyle = "#c31503";
	ctx.lineWidth = 4;
	ctx.lineCap = "round";
	ctx.beginPath();
	const lineY = 112;
	ctx.moveTo(canvas.width / 3, lineY);
	ctx.lineTo(canvas.width - canvas.width / 5, lineY);
	ctx.stroke();
	ctx.font = "18px Poppins";
	const displayXp = xpProgress > 1000 ? `${(xpProgress / 1000).toFixed(2)}k` : Math.floor(xpProgress);
	const displayXpToGo = xpLevelDif > 1000 ? `${(xpLevelDif / 1000).toFixed(2)}k` : xpLevelDif;
	const xpText = `${displayXp}/${displayXpToGo} XP`;
	const xpTextWidth = ctx.measureText(xpText).width;
	ctx.fillStyle = "#dddddd";
	const textY = 145;
	ctx.fillText(xpText, canvas.width - xpTextWidth - 80, textY);
	ctx.fillStyle = "#ffffff";
	ctx.font = "24px Poppins";
	const levelText = `Level ${userData.level + 1}`;
	const levelTextWidth = ctx.measureText(levelText).width;
	ctx.fillText(levelText, canvas.width / 3, textY);
	if (userData.rank) {
		ctx.fillText(`Rank ${userData.rank}`, canvas.width / 3 + levelTextWidth + 20, textY);
	}
	ctx.save();
	ctx.fillStyle = "#000000";
	ctx.beginPath();
	ctx.arc(125, 125, 100 / 1.25, 0, Math.PI * 2, true);
	ctx.fill();
	ctx.clip();
	const profileUrl = user.user.displayAvatarURL({ format: "png" });
	const avatar = await Canvas.loadImage(profileUrl);
	ctx.drawImage(avatar, 25 * 1.75, 25 * 1.75, 200 / 1.25, 200 / 1.25);
	const discordAdmins = adminIds.discord.developers;
	const isAdmin = discordAdmins.includes(user.id);
	const statuses = {
		online: "https://cdn.discordapp.com/emojis/726982918064570400.png?v=1",
		idle: "https://cdn.discordapp.com/emojis/726982942181818450.png?v=1",
		dnd: "https://cdn.discordapp.com/emojis/726982954580181063.png?v=1",
		offline: "https://cdn.discordapp.com/emojis/702707414927015966.png?v=1",
	};
	ctx.restore();
	const iconWidth = 60;
	const statusUrl = statuses[user.presence.status];
	const statusImage = await Canvas.loadImage(statusUrl);
	ctx.drawImage(statusImage, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, iconWidth, iconWidth);
	const supporters = adminIds.discord.supporters;
	const isSupporter = supporters.includes(user.id);
	if (isAdmin) {
		const adminLogo = "https://www.disstreamchat.com/logo.png";
		const adminImage = await Canvas.loadImage(adminLogo);
		ctx.drawImage(adminImage, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, 25 * 1.75, iconWidth, iconWidth);
	} else if (isSupporter) {
		const supporterLogo =
			"https://icons-for-free.com/iconfiles/png/512/best+bookmark+premium+rating+select+star+icon-1320168257340660520.png";
		const supporterImage = await Canvas.loadImage(supporterLogo);
		ctx.drawImage(supporterImage, 25 * 1.75 + 200 / 1.25 - (iconWidth * 0.8) / 1.15, 25 * 1.75, iconWidth * 0.8, iconWidth * 0.8);
	}
	return canvas;
};

const isAdmin = user => {
	const discordAdmins = adminIds.discord.developers;
	return discordAdmins.includes(user.id);
};

const adminWare = async (message, args, client, cb) => {
	const discordAdmins = adminIds.discord.developers;
	if (discordAdmins.includes(message.author.id)) {
		await cb(message, args, client);
	} else {
		await message.channel.send("❌ You don't have permission to use this command.");
	}
};

const embedJSON = (obj, title = "") => {
	const embed = new MessageEmbed().setTitle(title).setFooter("JSON embedded");
	for (const key of Object.keys(obj)) {
		const value = obj[key];
		if (value instanceof Array) {
			embed.addField(key, value.join("\n"));
		} else {
			embed.addField(key, value);
		}
	}
};

const getDiscordSettings = async ({ guild, client }) => {
	if (client?.settings?.[guild]) return client.settings[guild];
	console.log("getting settings from the database for " + guild + " the client exists: " + !!client);
	let settings = (await admin.firestore().collection("DiscordSettings").doc(guild).get()).data();
	if (!settings) {
		settings = {};
		try {
			await admin.firestore().collection("DiscordSettings").doc(guild).update({});
		} catch (err) {
			await admin.firestore().collection("DiscordSettings").doc(guild).set({});
		}
	}
	if (!client) return settings;
	client.settings = { ...(client.settings || {}), [guild]: settings };
	return settings;
};

const getLoggingSettings = async ({ guild, client }) => {
	if (client?.logging?.[guild]) return client.logging[guild];
	console.log("getting logging settings from the database for " + guild + " the client exists: " + !!client);
	let logging = (await admin.firestore().collection("loggingChannel").doc(guild).get()).data();
	if (!logging) {
		logging = {};
		try {
			await admin.firestore().collection("loggingChannel").doc(guild).update({});
		} catch (err) {
			await admin.firestore().collection("loggingChannel").doc(guild).set({});
		}
	}
	if (!client) return logging;
	client.logging = { ...(client.logging || {}), [guild]: logging };
	return logging;
};

const Random = (min, max) => {
	if (!max && min) {
		return Random(0, min);
	}
	return Math.random() * (max - min) + min;
};

const warn = (member, guild, client, message) => {};

const informMods = (message, guild, client) => {};

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

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

const hasDiscordInviteLink = urls => {
	for (const url of urls) {
		if (checkDiscordInviteLink(url)) {
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
	checkBannedDomain,
	hasBannedDomain,
	checkDiscordInviteLink,
	hasDiscordInviteLink,
	warn,
	informMods,
	getDiscordSettings,
	getLoggingSettings,
	isNumeric: value => {
		return /^-?\d+[.\,]?\d*$/.test(value);
	},
	randomChoice: arr => {
		return arr[Math.floor(arr.length * Math.random())];
	},
	formatFromNow: time => formatDistanceToNow(time, { addSuffix: true }),
	randomString: len => [...Array(len)].map(i => (~~(Math.random() * 36)).toString(36)).join(""),
	ArrayAny,
	hasPermission,
	walkSync,
	modWare,
	adminWare,
	resolveUser,
	Random,
	getRoleIds,
	generateRankCard,
	getLevel,
	getXp,
	roundRect,
	applyText,
	cleanRegex,
	hoursToMillis: hrs => hrs * 3600000,
	isAdmin,
	sleep: async millis => new Promise(resolve => setTimeout(resolve, millis)),
	setArray: items => (items ? (Array.isArray(items) ? items : [items]) : []),
};
