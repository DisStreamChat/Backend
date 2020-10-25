const { isAdmin, hasPermsission } = require("../../utils/functions");
const { MessageEmbed } = require("discord.js");

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

const getCommands = (message, client) => {
	let availableCommands = [];
	for (const [key, command] of Object.entries(client.commands)) {
		if (!command.adminOnly && !command.permissions?.length) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		} else if (command.adminOnly && isAdmin(message.author)) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		} else if (command.permissions?.length && hasPermsission(message.member, command.permissions || [])) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		}
	}
	return availableCommands;
};

const getHelpText = ({ message, client, selectedCommand }) =>
	selectedCommand
		? new MessageEmbed()
				.setTitle(`Help for ${selectedCommand.name.capitalize()}`)
				.setTimestamp(message.createdAt)
				.setColor("#206727")
				.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
				.addField("Description", selectedCommand.description)
				.addField("Parameters. <> => Required. () => optional", selectedCommand.usage?.join("\n") || "None")
				.setThumbnail(client.user.displayAvatarURL())
		: null;

module.exports = {
	name: "help",
	aliases: [],
	description: "See the commands you can use and get on help on each command",
	usage: "(command_name)",
	execute: async (message, args, client) => {
		let availableCommands = getCommands(message, client);
		if (args.length === 0) {
			const helpEmbed = new MessageEmbed()
				.setTitle("DisStreambot Help")
				.setDescription(`Here are all the available commands. The prefix for this server is \`${client.prefix || "!"}\``)
				.setThumbnail(client.user.displayAvatarURL())
				.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
				.addField("Available Commands", availableCommands.map(command => `\`${command.displayName}\``).join(", "))
				.addField(
					"Tip",
					"Type `help <command name>` for help on a specific commands and `help commands <command name>` to get help on a specific custom command "
				)
				.setTimestamp(message.createdAt)
				.setColor("#206727");
			if (hasPermsission(message.member, ["MANAGE_SERVER", "ADMINISTRATOR"])) {
				helpEmbed.addField(
					"Moderator Tip",
					"Type `help module` to get informations about the available module or `help module <module name>` for help on a specific module"
				);
			}
			if (isAdmin(message.author)) {
				helpEmbed.addField("DisStreamChat Admin Tip", "Type `help admin` for links to DisStreamChat admin tools");
			}
			await message.channel.send(helpEmbed);
		} else if (args[0] !== "module" && args[0] !== "admin" && args[0] !== "commands") {
			const selectedCommand = availableCommands.find(command => command.displayName?.toLowerCase() === args[0]?.toLowerCase());
			const commandHelpEmbed = getHelpText({ message, client, selectedCommand });
			if (!commandHelpEmbed) {
				await message.channel.send(":x: Command not found, use help to get the list of available commands");
			} else {
				await message.channel.send(commandHelpEmbed);
			}
		} else {
			switch (args[0]) {
				case "commands":
					const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
					const guildData = guildRef.data();
					if (args[1]) {
						const commandHelpEmbed = getHelpText({ message, client, selectedCommand: guildData[args[1]] });
						if (!commandHelpEmbed) {
							await message.channel.send(":x: Command not found, use `help` to get the list of available commands");
						} else {
							await message.channel.send(commandHelpEmbed);
						}
					} else {
						const availableCustomCommands = getCommands(message, { commands: guildData });
						const customHelpEmbed = new MessageEmbed()
							.setTitle("DisStreambot Help")
							.setDescription("Here are all the available custom commands")
							.setThumbnail(client.user.displayAvatarURL())
							.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
							.addField(
								"Available Commands",
								availableCustomCommands
									.map(command =>
										command.displayName.includes("<:") ? command.displayName : `\`${command.displayName}\``
									)
									.join(", ")
							)
							.addField("Tip", "Type `help commands <command name>` to get help on a specific command ")
							.setTimestamp(message.createdAt)
							.setColor("#206727");
						await message.channel.send(customHelpEmbed);
					}
					break;
			}
		}
	},
};
