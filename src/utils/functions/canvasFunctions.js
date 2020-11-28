import Canvas from "../Canvas";

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

module.exports = {
	generateRankCard,
	roundRect,
	applyText
}