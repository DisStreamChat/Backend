import fs from "fs";
import path, { join } from "path";

import { clientManager } from "../initClients";

export interface logOptions {
	file?: string;
	writeToConsole?: boolean;
	error?: boolean;
	DM?: boolean;
}

interface LoggerOptions {
	logToConsole?: boolean;
	logToFile?: boolean;
}

export class Logger {
	private static readonly LOG_FILE_PATH = join(__dirname, "../../", "logging");
	private static options: LoggerOptions;
	private static DISCORD_ADMIN_USER_ID = "193826355266191372";

	static configure(options: LoggerOptions) {
		this.options = options;
	}

	static log(message: string, options?: LoggerOptions) {
		const opts = { ...this.options, ...(options || {}) };
		message = `${this.formattedTime} - ${message}`;
		if (opts.logToConsole) console.log(message);

		if (opts.logToFile) this.appendToFile(`${message}\n`);
	}

	static warn(message: string, options?: LoggerOptions) {
		message = `${this.formattedTime} - WARN: ${message}`;
		const opts = { ...this.options, ...(options || {}) };
		if (opts.logToConsole) console.warn(message);

		if (opts.logToFile) this.appendToFile(`${message}\n`);
	}

	static async error(
		message: string,
		options?: LoggerOptions & { notifyDiscordAdmin?: boolean }
	) {
		const opts = { ...this.options, ...(options || {}) };
		message = `${this.formattedTime} - ERROR: ${message}`;

		if (opts.logToConsole) console.error(message);

		if (opts.logToFile) this.appendToFile(`${message}\n`);

		if (opts.notifyDiscordAdmin) await this.notifyDiscordAdmin(`ERROR: ${message}`);
	}

	private static async notifyDiscordAdmin(message: string) {
		const david = await clientManager.discordClient.users.fetch(this.DISCORD_ADMIN_USER_ID);
		await david.send(message);
	}

	private static get formattedTime() {
		return new Date().toLocaleTimeString("en-us", {
			timeZone: "America/New_York",
			timeZoneName: "short",
		});
	}

	private static appendToFile(content: string) {
		const dir = join(
			this.LOG_FILE_PATH,
			`${new Date().toLocaleDateString().replace(/\//g, "-")}.log`
		);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.appendFileSync(this.LOG_FILE_PATH, content);
	}
}
