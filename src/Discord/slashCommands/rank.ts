import { MessageAttachment } from "discord.js";
import { SlashCommandInteraction } from "../../clients/discord.client";
import { resolveUser, generateRankCard } from "../../utils/functions";
import admin from "firebase-admin";

export default {
	name: "rank",
	description: "get your rankcard or the rankcard of the selected user",
	options: [
		{
			name: "user",
			description: "the user who's rankcard who want",
			required: false,
			type: 3,
		},
	],
	execute: async (interaction: SlashCommandInteraction) => {
		const userId = interaction.arguments?.user;
		let member = await resolveUser(null, userId, interaction.guild);
		let msg = "";
		if (!member) {
			member = await interaction.guild.members.fetch(interaction.user.id);
		}

		if (member.user.bot) {
			return await interaction.reply(`❌ ${member} is a bot and bots don't level.`);
		}

		let userData = (
			await admin
				.firestore()
				.collection("Leveling")
				.doc(interaction.guild.id)
				.collection("users")
				.doc(member.id)
				.get()
		).data();

		const customRankCardData = (
			await admin.firestore().collection("Streamers").where("discordId", "==", member.id).get()
		).docs[0]?.data?.();

		if (!userData) userData = { xp: 0, level: 0 };

		const sorted = (
			await admin
				.firestore()
				.collection("Leveling")
				.doc(interaction.guild.id)
				.collection("users")
				.orderBy("xp", "desc")
				.get()
		).docs.map(doc => ({ id: doc.id, ...doc.data() }));

		let rank = sorted.findIndex(entry => entry.id === member.id) + 1;
		if (rank === 0) rank = sorted.length + 1;
		userData.rank = rank;
		const rankCard = await generateRankCard({ ...userData, ...(customRankCardData || {}) }, member);
		const attachment = new MessageAttachment(rankCard, "card.png");
		console.log(attachment);
		interaction.reply({
			content: `${msg}
		`,
		});
	},
};
