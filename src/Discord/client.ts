import Discord from "discord.js";

export class DisStreamClient extends Discord.Client {
	constructor(options?: Discord.ClientOptions) {
		super(options);
	}
}
