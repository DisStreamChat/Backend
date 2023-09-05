import Discord from "discord.js";

export class DisStreamClient extends Discord.Client {
	settings: Record<string, any> = {};
	logging: Record<string, any> = {};
	leveling: Record<string, any> = {};
	listening: Record<string, any> = {};

	constructor(options?: Discord.ClientOptions) {
		super(options);
	}
}
