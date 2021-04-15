import { resolveUser, generateRankCard }from "../../../utils/functions";
import { MessageAttachment } from "discord.js";
import path from "path";
import fs from "fs";

// the admin app has already been initialized in routes/index.js
import admin from "firebase-admin";

export default {
	name: "rank",
	aliases: ["level"],
	id: "rank",
	category: "leveling",
	plugin: "leveling",
	description: "Get someones experience and level on this server in a rankcard.",
	usage: ["(user)"],
	execute: async (message, args, client) => {
		let user = await resolveUser(message, args.join(" "));
		let msg = "";
		if (!user) {
			if (args.length) {
				msg = "user not found, here are your stats";
			}
			user = message.member;
		}
		if (user.user?.bot || user.bot) {
			return await message.channel.send(`❌ ${user} is a bot and bots don't level.`);
		}
		let userData = (
			await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").doc(user.id).get()
		).data();
		const customRankCardData = (await admin.firestore().collection("Streamers").where("discordId", "==", user.id).get()).docs[0]?.data?.();
		if (!userData) userData = { xp: 0, level: 0 };

		const sorted = (
			await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").orderBy("xp", "desc").get()
		).docs.map(doc => ({ id: doc.id, ...doc.data() }));
		let rank = sorted.findIndex(entry => entry.id === user.id) + 1;
		if (rank === 0) rank = sorted.length + 1;
		userData.rank = rank;
		const rankCard = await generateRankCard({...userData, ...(customRankCardData || {})}, user);
		const attachment = new MessageAttachment(rankCard.toBuffer(), "card.png");
		message.channel.send(msg, attachment);
		fs.writeFileSync(path.join(__dirname, `../../../../images/${user.user.username}.png`), rankCard.toBuffer());
	},
};
