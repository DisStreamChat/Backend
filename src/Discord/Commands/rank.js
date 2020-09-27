const { resolveUser, generateRankCard } = require("../../utils/functions");
const { MessageAttachment } = require("discord.js");
const path = require("path");
const fs = require("fs");
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { registerFont } = require("canvas");
registerFont(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });

module.exports = {
	name: "rank",
	aliases: ["level"],
	description: "Get someones experience and level on this server in a rankcard.",
	usage: "(user)",
	execute: async (message, args, client) => {
		let user = resolveUser(message, args.join(" "));
		let msg = "";
		if (!user) {
			if (args.length) {
				msg = "user not found, here are your stats";
			}
			user = message.member;
		}
		if (user.user.bot) {
			return await message.channel.send(`❌ ${user} is a bot and bots don't level.`);
		}
		const guildRef = await admin.firestore().collection("Leveling").doc(message.guild.id).get();
		const guildData = guildRef.data();
		let userData = guildData[user.id];
		if (!userData) userData = { xp: 0, level: 0 };
		const rankCard = await generateRankCard(userData, user);
		const attachment = new MessageAttachment(rankCard.toBuffer(), "card.png");
		fs.writeFileSync(path.join(__dirname, `../../../images/${user.user.username}.png`), rankCard.toBuffer());
		message.channel.send(msg, attachment);
	},
};
