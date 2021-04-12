const path = require("path");
const fs = require("fs");
const { adminWare, modWare } = require("../utils/functions");
const commandPath = path.join(__dirname, "Commands");
const commandFiles = fs.readdirSync(commandPath);
const commands = {};

commandFiles.forEach(command => {
	if (command.endsWith(".js")) {
		const commandObj = require(path.join(commandPath, command));
		const _ = [commandObj.name, ...commandObj.aliases].map(name => {
			commands[name] = commandObj;
		});
	}
});


// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

const prefix = "!";

export default async (message, client, streamerName) => {
    if (!message.startsWith(prefix)) return;
    const args = message.split(" ");
    const command = args.shift().slice(1);
    const commandObj = commands[command];
    console.log(commandObj)
    if(!commandObj){

    }else{
        if (commandObj.adminOnly) await adminWare(message, args, client, commandObj.execute);
		// else if (commandObj.permissions) await modWare(message, args, client, commandObj.permissions, commandObj.execute);
		else await commandObj.execute(message, args, client, streamerName);
    }
};
