// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

module.exports = {
	name: "commands",
	aliases: ["customCommands"],
	description: "command to manage custom commands",
	permissions: ["MANAGE_MESSAGES"],
	execute: async (message, args, client) => {
		switch (args[0]) {
			case "add":
				const name = args[1];
				const customMessage = args.slice(2).join(" ");
				const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
				const guildData = guildRef.data();
				if (Object.keys(guildData || {}).includes(name)) {
					return await message.channel.send(`The command ${name} already exists`);
				}
				if(!guildData){
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
                await message.channel.send(`The command "${name}" has been added successfully.`)

				break;

			default:
				await message.channel.send("❌ Invalid parameter specified. Possible parameters: add/delete/edit");
		}
	},
};
