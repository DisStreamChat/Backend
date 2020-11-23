const { isAdmin, hasPermission, ArrayAny, getRoleIds } = require("../../utils/functions");
const { MessageEmbed } = require("discord.js");
import { getDiscordSettings } from "../../utils/functions";

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

const getCommands = async (message, client, plugins) => {
	let availableCommands = [];
	for (const [key, command] of Object.entries(client.commands)) {
		const commandObj = { displayName: key, ...command };
		//check if command is enabled
		const enabled = !!command.plugin ? plugins[command.plugin] : true;
		if (!enabled) continue;
		if (!command.adminOnly && !command.permissions?.length) {
			availableCommands.push(commandObj);
			continue;
		} else if (command.adminOnly && isAdmin(message.author)) {
			availableCommands.push(commandObj);
			continue;
		} else if (command.permissions?.length && await hasPermission(message.member, command.permissions || [])) {
			availableCommands.push(commandObj);
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
				.addField("Description", selectedCommand.description || "No Description Provided")
				.addField(
					"Parameters. <> => Required. () => optional",
					(Array.isArray(selectedCommand.usage) ? selectedCommand.usage?.join?.("\n") : selectedCommand.usage) || "None"
				)
				.setThumbnail(client.user.displayAvatarURL())
		: null;

const filterCustomCommands = (commands, { member, channel }) => {
	let availableCommands = [];
	const RoleIds = getRoleIds(member);
	for (const [key, command] of Object.entries(commands || {})) {
		const commandObj = { displayName: key, ...command };
		const { allowedChannels = [], bannedRoles = [], permittedRoles = [] } = command;
		const hasBannedRole = ArrayAny(bannedRoles, RoleIds);
		const hasPermittedRole = permittedRoles.length === 0 || ArrayAny(permittedRoles, RoleIds);
		const inAllowedChannel = allowedChannels.length === 0 || allowedChannels.includes(channel);
		if (hasBannedRole || !hasPermittedRole || !inAllowedChannel) continue;
		availableCommands.push(commandObj);
	}
	return availableCommands;
};
module.exports = {
	name: "help",
	id: "help",
	category: "info",
	aliases: [],
	description: "See the commands you can use and get on help on each command",
	usage: "(command_name)",
	execute: async (message, args, client) => {
		const guildSettings = await getDiscordSettings({ client, guild: message.guild.id });
		let availableCommands = await getCommands(message, client, guildSettings?.activePlugins || {});
		const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
		const guildData = guildRef.data();
		let customCommands = filterCustomCommands(guildData, message);
		const allCommands = [...availableCommands, ...customCommands];
		if (args.length === 0) {
			const helpEmbed = new MessageEmbed()
				.setTitle("DisStreambot Help")
				.setDescription(`Here are all the available commands.`)
				.addField("Prefix", client.prefix || "!")
				.setThumbnail(client.user.displayAvatarURL())
				.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
				.addField("Available Commands", allCommands.map(command => `\`${command.displayName}\``).join(", "))
				.addField(
					"Tip",
					"Type `help <command name>` for help on a specific commands and `help commands <command name>` to get help on a specific custom command "
				)
				.setTimestamp(message.createdAt)
				.setColor("#206727");
			if (await hasPermission(message.member, ["MANAGE_SERVER", "ADMINISTRATOR"])) {
				helpEmbed.addField(
					"Moderator Tip",
					"Type `help module` to get informations about the available module or `help module <module name>` for help on a specific module"
				);
			}
			if (isAdmin(message.author)) {
				helpEmbed.addField("DisStreamChat Admin Tip", "Type `help admin` for links to DisStreamChat admin tools");
			}
			helpEmbed.addField(
				"Support Server",
				"If you have any questions or bug reports come tell us at http://discord.disstreamchat.com"
			);
			helpEmbed.addField("Custom Commands", "To get more help on custom commands use `help commands`");
			await message.channel.send(helpEmbed);
		} else if (args[0] !== "module" && args[0] !== "admin" && args[0] !== "commands") {
			const selectedCommand = allCommands.find(command => command.displayName?.toLowerCase() === args[0]?.toLowerCase());
			const commandHelpEmbed = getHelpText({ message, client, selectedCommand });
			if (!commandHelpEmbed) {
				await message.channel.send(":x: Command not found, use help to get the list of available commands");
			} else {
				await message.channel.send(commandHelpEmbed);
			}
		} else {
			switch (args[0]) {
				case "commands":
					if (args[1]) {
						const commandHelpEmbed = getHelpText({ message, client, selectedCommand: guildData[args[1]] });
						if (!commandHelpEmbed) {
							await message.channel.send(":x: Command not found, use `help` to get the list of available commands");
						} else {
							await message.channel.send(commandHelpEmbed);
						}
					} else {
						const availableCustomCommands = await getCommands(message, { commands: guildData });
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
							.setColor("#206727")
							.addField(
								"Support Server",
								"If you have any questions or bug reports come tell us at http://discord.disstreamchat.com"
							);
						await message.channel.send(customHelpEmbed);
					}
					break;
			}
		}
	},
};
