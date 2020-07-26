const { resolveUser, generateRankCard } = require("../../utils/functions");
const { MessageAttachment } = require("discord.js");
const path = require("path");
const fs = require("fs")
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { createCanvas, loadImage, registerFont } = require("canvas");
registerFont(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });


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
        const rankCard = await generateRankCard(userData, user)
        const attachment = new MessageAttachment(rankCard.toBuffer(), "card.png");
        fs.writeFileSync(path.join(__dirname, `../../../images/${user.user.username}.png`), rankCard.toBuffer())
		message.channel.send(attachment);
	},
};