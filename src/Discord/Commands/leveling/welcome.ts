import { Message, MessageAttachment } from "discord.js";
import admin from "firebase-admin";

import { generateRankCard, generateWelcomeCard, resolveUser } from "../../../utils/functions";

export default {
	name: "welcome",
	id: "welcome",
	category: "leveling",
	plugin: "leveling",
	description: "Get someones experience and level on this server in a welcomecard.",
	usage: ["(user)"],
	execute: async (message: Message, args, client) => {
		let member = await resolveUser(message, args.join(" "));
		let msg = "";
		if (!member) {
			if (args.length) {
				msg = "user not found, here are your stats";
			}
			member = message.member;
		}

		if (member.user.bot) {
			return await message.channel.send(`❌ ${member} is a bot and bots don't level.`);
		}

		let userData = (
			await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").doc(member.id).get()
		).data();

		const customRankCardData = (
			await admin.firestore().collection("Streamers").where("discordId", "==", member.id).get()
		).docs[0]?.data?.();

		if (!userData) userData = { xp: 0, level: 0 };

		const sorted = (
			await admin.firestore().collection("Leveling").doc(message.guild.id).collection("users").orderBy("xp", "desc").get()
		).docs.map(doc => ({ id: doc.id, ...doc.data() }));

		let rank = sorted.findIndex(entry => entry.id === member.id) + 1;
		if (rank === 0) rank = sorted.length + 1;
		userData.rank = rank;
		const rankCard = await generateWelcomeCard(message.guild, member, {
			backgroundImage:
				"https://cdn.discordapp.com/attachments/711241362686607420/857805048084299786/04487fc8e391ab25b3b0efd4b18b7afa.png",
		});
		const attachment = new MessageAttachment(rankCard, "card.png");
		message.channel.send(msg, attachment);
	},
};
