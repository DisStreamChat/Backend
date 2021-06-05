import { Client, MessageEmbed } from "discord.js";
import { client } from "tmi.js";
import { Object } from "../models/shared.model";
import { log } from "../utils/functions/logging";

interface SlashCommandOptions {
	data: {
		name: string;
		description: string;
	};
}

export class DiscordClient extends Client {
	constructor(options) {
		super(options);
	}

	get _api() {
		// @ts-ignore
		return this.api;
	}

	get application() {
		//@ts-ignore
		return this._api.applications(this.user.id);
	}

	getApp(guildId: string) {
		let app = this.application;
		if (guildId) {
			app = app.guilds(guildId);
		}
		return app;
	}

	async reply(id: string, token: string, response: { data: Object<any> }) {
		//@ts-ignore
		this._api.interactions(id, token).callback.post(response);
	}

	async getSlashCommands(guildId: string) {
		return this.getApp(guildId).commands.get();
	}

	async registerSlashCommand(details: SlashCommandOptions) {
		const guilds = this.guilds.cache.array();
		for (const guild of guilds) {
			try {
				const commands = await this.getSlashCommands(guild.id);
				if (commands.find(({ name }) => name === details.data.name)) continue;

				await this.getApp(guild.id).commands.post(details);
			} catch (err) {
				log(err, { error: true });
			}
		}
	}

	slashCommandHandler() {
		this.ws.on("INTERACTION_CREATE" as any, async interaction => {
			const command = interaction.data.name.toLowerCase();
			if (command === "ping") {
				let pingembed = new MessageEmbed()
					.setTitle(`🏓 Pong!`)
					.addFields({ name: `${this.user.username}'s Ping:`, value: `${Math.round(this.ws.ping)}ms` });
				await this.reply(interaction.id, interaction.token, {
					data: {
						type: 4,
						flags: 64,
						data: {
							embeds: [pingembed]
						},
					},
				});
			}
		});
	}
}
