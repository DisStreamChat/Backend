require("dotenv").config();
const path = require("path");
const fs = require("fs");
const { adminWare, modWare } = require("../utils/functions");
const commandPath = path.join(__dirname, "Commands");
const commandFiles = fs.readdirSync(commandPath);
const commands = {};
const customCommandHandler = require("./Commands/CustomCommands");

// TODO: use WalkSync to allow for nested folders in command directory
commandFiles.forEach(command => {
	if (command.endsWith(".js")) {
		const commandObj = require(path.join(commandPath, command));
		const _ = [commandObj.name, ...(commandObj.aliases || [])].map(name => {
			commands[name] = commandObj;
		});
	}
});

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

// const prefix = "!";

module.exports = async (message, client) => {
	if (!client.commands) {
		client.commands = commands;
	}
	let prefix = "!";
	try {
		const settings = (await admin.firestore().collection("DiscordSettings").doc(message.guild.id).get())?.data();
		prefix = settings?.prefix || "!";
	} catch (err) {}
	if (process.env.BOT_DEV == "true") prefix = "?";
    client.prefix = prefix;
    const isMention = (message?.mentions?.users?.has(client.user.id))
	let isCommand = message.content.startsWith(prefix) || isMention;
    if (!isCommand) return;
    if(isMention){
        message.content = message.content.replace(`<@!${client.user.id}> `, "")
    }
	const args = message.content.split(" ");
    let command = args.shift();
    if(!isMention){
        command = command.slice(prefix.length)
    }
	const commandObj = commands[command];
	if (!commandObj) {
		customCommandHandler({ message, args, client, command });
	} else {
		if (commandObj.adminOnly) await adminWare(message, args, client, commandObj.execute);
		else if (commandObj.permissions) await modWare(message, args, client, commandObj.permissions, commandObj.execute);
		else await commandObj.execute(message, args, client);
	}
};
