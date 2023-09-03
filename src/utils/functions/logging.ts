import fs, { promises } from "fs";
import { join } from "path";

import { DiscordClient } from "../initClients";

const loggingPath = join(__dirname, "../../", "logging");

export interface logOptions {
	file?: string;
	writeToConsole?: boolean;
	error?: boolean;
	DM?: boolean;
}

export const log = async (loggingString, { file, writeToConsole, error, DM }: logOptions = {}) => {
	const loggingFilePath = join(loggingPath, file || `${new Date().toLocaleDateString().replace(/\//g, "-")}.log`);
	if (!fs.existsSync(loggingPath)) {
		console.log("creating directory");
		await promises.mkdir(loggingPath, { recursive: true });
		await promises.writeFile(loggingFilePath, "");
	}

	loggingString = `${new Date().toLocaleTimeString("en-us", { timeZone: "America/New_York", timeZoneName: "short" })}: ${loggingString}`;
	if (error) {
		loggingString = `An Error Occured: ${loggingString}`;
	}
	promises.appendFile(loggingFilePath, `\n${loggingString}`);
	if (writeToConsole) {
		console.log(loggingString);
	}
	if (DM) {
		const david = await DiscordClient.users.fetch("193826355266191372");
		const message = await david.send(loggingString);
		console.log();
	}
};
