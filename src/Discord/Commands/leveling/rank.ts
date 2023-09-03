import { Message, MessageAttachment, TextChannel } from "discord.js";
import admin from "firebase-admin";

import { generateRankCard, resolveUser } from "../../../utils/functions";

export default {
	name: "rank",
	aliases: ["level"],
	id: "rank",
	category: "leveling",
	plugin: "leveling",
	description: "Get someones experience and level on this server in a rankcard.",
	usage: ["(user)"],
	execute: async (message: Message, args, client) => {
		(message.channel as TextChannel).startTyping();
		let user = await resolveUser(message, args.join(" "));
		let msg = "";
		if (!user) {
			if (args.length) {
				msg = "user not found, here are your stats";
			}
			user = message.member;
		}
		if (user.user?.bot) {
			return await message.channel.send(`❌ ${user} is a bot and bots don't level.`);
		}

		let userData = (await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").doc(user.id).get()).data();
		let customRankCardData = userData;
		if (!customRankCardData.primaryColor) {
			customRankCardData = (
				await admin.firestore().collection("Streamers").where("discordId", "==", user.id).get()
			).docs[0]?.data?.();
		}

		if (!userData) userData = { xp: 0, level: 0, rank: 100000 };
		const sorted = (
			await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").orderBy("xp", "desc").get()
		).docs.map(doc => ({ id: doc.id, ...doc.data() }));
		let rank = sorted.findIndex(entry => entry.id === user.id) + 1;
		if (rank === 0) rank = sorted.length + 1;
		userData.rank = rank;
		const rankCard = await generateRankCard({ ...userData, ...(customRankCardData || {}) }, user);
		const attachment = new MessageAttachment(rankCard, "card.png");
		(message.channel as TextChannel).stopTyping();

		await message.channel.send(msg, attachment);
	},
};
