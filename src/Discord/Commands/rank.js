const { resolveUser } = require("../../utils/functions");
const { MessageAttachment } = require("discord.js");
const path = require("path");
const fs = require("fs")
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { createCanvas, loadImage, registerFont } = require("canvas");
console.log(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"));
registerFont(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });

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

const getLevel = xp => Math.max(0, Math.floor(Math.log(xp - 100)));
const getXp = level => Math.floor(100 + Math.exp(level));

module.exports = {
	name: "rank",
	aliases: ["level"],
	description: "get your level",
	execute: async (message, args, client) => {
		let user = resolveUser(message, args.join(" "));
		if (!user) user = message.member;
		const guildRef = await admin.firestore().collection("Leveling").doc(message.guild.id).get();
		const guildData = guildRef.data();
		let userData = guildData[user.id];
		if (!userData) userData = { xp: 0, level: 0 };
		const canvas = createCanvas(700, 250);
		const ctx = canvas.getContext("2d");
		const xpToNextLevel = getXp(userData.level + 1);
		const currentXp = userData.xp;
		const percentDone = currentXp / xpToNextLevel;
		ctx.fillStyle = "#090b0b";
		roundRect(ctx, 0, 0, canvas.width, canvas.height, 125);

		const barWidth = canvas.width / 1.9;
		const barHeight = 25;

		ctx.fillStyle = "#484b4e";
		roundRect(ctx, canvas.width / 2.75, 185, barWidth, barHeight, barHeight / 2);
		ctx.fillStyle = "#c31503";
		roundRect(ctx, canvas.width / 2.75, 185, barWidth * percentDone, barHeight, barHeight / 2);

		ctx.font = "28px Poppins";

		ctx.fillStyle = "#ffffff";
		ctx.fillText(`${user.user.tag}`, canvas.width / 2.75, 170);
		ctx.font = "20px Poppins";
		const displayXp = userData.xp > 1000 ? `${(userData.xp / 1000).toFixed(1)}k` : userData.xp;
		const displayXpToGo = xpToNextLevel > 1000 ? `${(xpToNextLevel / 1000).toFixed(1)}k` : xpToNextLevel;
		const xpText = `${displayXp}/${displayXpToGo} XP`;
		const xpTextWidth = ctx.measureText(xpText).width;
		ctx.fillStyle = "#dddddd";
		ctx.fillText(xpText, canvas.width - xpTextWidth - 80, 170);
		ctx.fillStyle = "#ffffff";
		ctx.font = "42px Poppins";
		const levelText = `Level: ${userData.level}`;
		const levelTextWidth = ctx.measureText(levelText).width;
		ctx.fillText(levelText, canvas.width - levelTextWidth - 80, 50);

		ctx.fillStyle = "#000000";
		ctx.beginPath();
		ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
		ctx.fill();
		ctx.clip();
		const profileUrl = user.user.displayAvatarURL({ format: "png" });
		const avatar = await loadImage(profileUrl);
		ctx.drawImage(avatar, 25, 25, 200, 200);

        const attachment = new MessageAttachment(canvas.toBuffer(), "welcome-image.png");
        fs.writeFileSync(path.join(__dirname, `../../../images/${user.username}.png`), canvas.toBuffer())
		message.channel.send(attachment);
	},
};
