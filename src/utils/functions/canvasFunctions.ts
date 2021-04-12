const Canvas = require("canvas");
// import { Canvas } from "canvas";
const adminIds = require("../../ranks.json");
import { getXp } from "./levelingFunctions";

const applyText = (canvas, text, defaultFontSize = 70, minFontSize = 0, font = "sans-serif", widthTest = null) => {
	const ctx = canvas.getContext("2d");

	// Declare a base size of the font
	let fontSize = defaultFontSize;
	ctx.font = `${fontSize}px ${font}`;

	while (ctx.measureText(text).width > (widthTest || canvas.width - 300)) {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${(fontSize -= 5)}px ${font}`;
		if (fontSize < minFontSize) return ctx.font;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	}

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

const roundCanvas = function (ctx, x, y, w, h, r = 0, cb) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.clip();
	cb();
	ctx.restore();
	return ctx;
};

const generateRankCard = async (userData, user) => {
	const primaryColor = userData.primaryColor || "#c31503";
	const backgroundColor1 = "#1f2525a0";
	const backgroundColor2 = `#090b0b${(userData.backgroundOpacity ?? 255).toString(16)}`;
	const xpBarBackground = "#484b4e";
	const black = "#000000";
	const backgroundImage = userData.backgroundImage;

	const canvas = Canvas.createCanvas(700, 250);
	const ctx = canvas.getContext("2d");

	// calculate all required values
	const xpToNextLevel = getXp(userData.level + 1);
	const xpForCurrentLevel = getXp(userData.level);
	const xpLevelDif = Math.abs(xpToNextLevel - xpForCurrentLevel);
	const xpProgress = Math.abs(userData.xp - xpForCurrentLevel);
	const percentDone = xpProgress / xpLevelDif;
	const displayXp = xpProgress > 1000 ? `${(xpProgress / 1000).toFixed(2)}k` : Math.floor(xpProgress);
	const displayXpToGo = xpLevelDif > 1000 ? `${(xpLevelDif / 1000).toFixed(2)}k` : xpLevelDif;

	// draw the first background
	if (backgroundImage) {
		const backgroundImageFile = await Canvas.loadImage(backgroundImage);
		roundCanvas(ctx, 0, 0, canvas.width, canvas.height, 125, () => {
			ctx.drawImage(backgroundImageFile, 0, 0, canvas.width, canvas.height);
		});
	} else {
		ctx.fillStyle = backgroundColor1;
		roundRect(ctx, 0, 0, canvas.width, canvas.height, 125);
	}

	// draw the second background
	ctx.fillStyle = backgroundColor2;
	const gap = 20;
	roundRect(ctx, gap, gap, canvas.width - gap * 2, canvas.height - gap * 2, 125);

	// draw xp progress bar
	const barWidth = canvas.width / 1.75;
	const barHeight = 25;
	const barY = 160;
	ctx.fillStyle = xpBarBackground;
	roundRect(ctx, canvas.width / 3, barY, barWidth, barHeight, barHeight / 2);
	ctx.fillStyle = primaryColor;
	roundRect(ctx, canvas.width / 3, barY, Math.max(barWidth * percentDone, barHeight), barHeight, barHeight / 2);

	// draw nickname
	ctx.fillStyle = "#ffffff";
	const name = `${user.nickname || user.user.username}${user.user.tag.slice(-5)}`;
	ctx.font = applyText(canvas, name, 24, 8, "Poppins");
	ctx.fillText(`${name}`, canvas.width / 3, 100);

	// draw line under username
	ctx.strokeStyle = primaryColor;
	ctx.lineWidth = 4;
	ctx.lineCap = "round";
	ctx.beginPath();
	const lineY = 112;
	ctx.moveTo(canvas.width / 3, lineY);
	ctx.lineTo(canvas.width - canvas.width / 5, lineY);
	ctx.stroke();

	// draw xp
	ctx.font = "18px Poppins";
	const xpText = `${displayXp}/${displayXpToGo} XP`;
	const xpTextWidth = ctx.measureText(xpText).width;
	ctx.fillStyle = "#dddddd";
	const textY = 145;
	ctx.fillText(xpText, canvas.width - xpTextWidth - 80, textY);

	// draw users and level and rank
	ctx.fillStyle = "#ffffff";
	ctx.font = "24px Poppins";
	const levelText = `Level ${userData.level + 1}`;
	const levelTextWidth = ctx.measureText(levelText).width;
	ctx.fillText(levelText, canvas.width / 3, textY);
	if (userData.rank) {
		ctx.fillText(`Rank ${userData.rank}`, canvas.width / 3 + levelTextWidth + 20, textY);
	}

	// draw profile picture
	ctx.save();
	ctx.fillStyle = black;
	ctx.beginPath();
	ctx.arc(125, 125, 100 / 1.25, 0, Math.PI * 2, true);
	ctx.fill();
	ctx.clip();
	const profileUrl = user.user.displayAvatarURL({ format: "png" });
	const avatar = await Canvas.loadImage(profileUrl);
	ctx.drawImage(avatar, 25 * 1.75, 25 * 1.75, 200 / 1.25, 200 / 1.25);
	ctx.restore();

	// draw status icon
	const iconWidth = 60;
	const discordAdmins = adminIds.discord.developers;
	const isAdmin = discordAdmins.includes(user.id);
	const statuses = {
		online: "https://cdn.discordapp.com/emojis/726982918064570400.png?v=1",
		idle: "https://cdn.discordapp.com/emojis/726982942181818450.png?v=1",
		dnd: "https://cdn.discordapp.com/emojis/726982954580181063.png?v=1",
		offline: "https://cdn.discordapp.com/emojis/702707414927015966.png?v=1",
	};
	const statusUrl = statuses[user.presence.status];
	const statusImage = await Canvas.loadImage(statusUrl);
	ctx.drawImage(statusImage, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, iconWidth, iconWidth);

	// draw supporter and admin badges
	const supporters = adminIds.discord.supporters;
	const isSupporter = supporters.includes(user.id);
	if (isAdmin) {
		const adminLogo = "https://www.disstreamchat.com/logo.png";
		const adminImage = await Canvas.loadImage(adminLogo);
		ctx.drawImage(adminImage, 25 * 1.75 + 200 / 1.25 - iconWidth / 1.15, 25 * 1.75, iconWidth, iconWidth);
	} else if (isSupporter) {
		// TODO: add in tiered supporter badges
		const supporterLogo =
			"https://icons-for-free.com/iconfiles/png/512/best+bookmark+premium+rating+select+star+icon-1320168257340660520.png";
		const supporterImage = await Canvas.loadImage(supporterLogo);
		ctx.drawImage(supporterImage, 25 * 1.75 + 200 / 1.25 - (iconWidth * 0.8) / 1.15, 25 * 1.75, iconWidth * 0.8, iconWidth * 0.8);
	}
	return canvas;
};

export default {
	generateRankCard,
	roundRect,
	applyText,
};
