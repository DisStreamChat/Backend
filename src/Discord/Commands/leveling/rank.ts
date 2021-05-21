import { resolveUser, generateRankCard } from "../../../utils/functions";
import { MessageAttachment } from "discord.js";

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
		console.time("function");
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

		console.time("user fetch");
		let userData = (await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").doc(user.id).get()).data();

		const customRankCardData = (
			await admin.firestore().collection("Streamers").where("discordId", "==", user.id).get()
		).docs[0]?.data?.();
		console.timeEnd("user fetch");
		
		if (!userData) userData = { xp: 0, level: 0, rank: 100000 };
		console.time("start generating");
		const rankCard = await generateRankCard({ ...userData, ...(customRankCardData || {}) }, user);
		const attachment = new MessageAttachment(rankCard, "card.png");
		console.timeEnd("start generating");
		console.timeEnd("function");
		message.channel.send(msg, attachment);
	},
};
