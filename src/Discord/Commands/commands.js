const { MessageEmbed } = require("discord.js");
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

module.exports = {
	name: "commands",
	aliases: ["customCommands"],
	description: "Command to manage custom commands. use `help commands <command name>` for help on a specific custom command",
	permissions: ["MANAGE_MESSAGES"],
	usage: ["<add | delete>"],
	execute: async (message, args, client) => {
		const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
		const guildData = guildRef.data();
		switch (args[0]) {
			case "add":
				const name = args[1];
				const customMessage = args.slice(2).join(" ");

				if (Object.keys(guildData || {}).includes(name)) {
					return await message.channel.send(`The command "${name}" already exists`);
				}
				if (!guildData) {
					await admin
						.firestore()
						.collection("customCommands")
						.doc(message.guild.id)
						.set({
							[name]: {
								name,
								aliases: [],
								message: customMessage,
							},
						});
				} else {
					await admin
						.firestore()
						.collection("customCommands")
						.doc(message.guild.id)
						.update({
							[name]: {
								name,
								aliases: [],
								message: customMessage,
							},
						});
				}
				await message.channel.send(`The command "${name}" has been added successfully.`);

				break;

			case "delete":
				const nameToDelete = args[1];
				if (!Object.keys(guildData || {}).includes(nameToDelete)) {
					return await message.channel.send(`The command "${nameToDelete}" doesn't exist`);
				} else {
					const copy = { ...guildData };
					delete copy[nameToDelete];
					await admin.firestore().collection("customCommands").doc(message.guild.id).set(copy);
				}
				await message.channel.send(`The command "${nameToDelete}" has been deleted successfully.`);
				break;

			default:
				const errorEmbed = new MessageEmbed()
					.setColor("#ee1111")
					.setTitle("Invalid Param")
					.setAuthor(client.user.tag, client.user.displayAvatarURL())
					.setDescription(":x: Invalid parameter specified, use !help commands to get help on commands. \nManage commands at: https://www.disstreamchat.com/#/dashboard/discord/customcommands")
					.addField("Valid Params", "`add`, `delete`")
					.setFooter(`DisStreamChat Custom Commands`)
					.setTimestamp(new Date())
				await message.channel.send(errorEmbed);
		}
	},
};
