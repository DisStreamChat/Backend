require("dotenv").config();
import { MessageEmbed } from "discord.js";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

export default {
	name: "stats",
	id: "bot-stats",
	category: "admin",
	aliases: [],
	description: "Get DisStreamChat Stats",
	adminOnly: true,
	execute: async (message, args, client) => {
		const users = await admin.firestore().collection("Streamers").get();
		const guilds = client.guilds.cache.array();
		const serverCount = guilds.length;

		const guildJson = JSON.stringify(
			guilds.map(guild => ({
				name: guild.name,
				memberCount: guild.memberCount,
				owner: { name: guild.owner.tag, id: guild.ownerId },
				partnered: guild.partnered,
				region: guild.region,
				joinedAt: guild.joinedAt.toLocaleString(),
			}))
		);

		fs.writeFile("public/guilds.json", guildJson, () => {});

		const embed = new MessageEmbed()
			.setTitle("DisStreamChat Stats")
			.setColor("#2d698d")
			.setThumbnail("https://www.disstreamchat.com/logo.png")
			.setAuthor("DisStreamChat", "https://www.disstreamchat.com/logo.png")
			.addField("Server count", serverCount, true)
			.addField("All users", users.docs.length, true);

		message.channel.send(embed);
	},
};
