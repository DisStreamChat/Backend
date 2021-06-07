import { Channel, Client, Guild, GuildMember, User } from "discord.js";
import { Object } from "../models/shared.model";
import { log } from "../utils/functions/logging";

interface SlashCommandOptions {
	name: string;
	description: string;
	options?: any[];
}

interface SlashCommandResponse {
	ephemeral?: boolean;
	content?: string;
	embed?: any;
	embeds?: any[];
	component?: any;
	components?: any[];
	attachments?: any[]
}

export class SlashCommandInteraction {
	arguments: Object<string>;

	channel: Channel;
	guild: Guild;
	member: GuildMember;
	user: User;
	id: string;
	token: string;
	name: string;
	createdAt: number;
	author: User;
	constructor(interaction, public client: DiscordClient) {
		this.createdAt = new Date().getTime();
		this.guild = this.client.guilds.resolve(interaction.guild_id);
		this.channel = this.guild.channels.resolve(interaction.channel_id);
		this.user = this.client.users.resolve(interaction.member.user.id);
		this.member = this.guild.members.resolve(interaction.member.id);
		this.token = interaction.token;
		this.id = interaction.id;
		this.arguments = interaction.data.options?.reduce((acc, cur) => ({ ...acc, [cur.name]: cur.value }), {});
		this.name = interaction.data.name;
		this.author = this.user;
	}

	async reply(data: SlashCommandResponse | string) {
		if (typeof data === "string") data = { content: data };

		const newData = {
			embeds: data.embeds || data.embed ? [...(data.embeds || []), data.embed] : null,
			// components: [...(data.components || []), data.component],
			flags: data.ephemeral ? 64 : null,
			content: data.content,
			attachments: data.attachments
		};
		await this.client._api.interactions(this.id, this.token).callback.post({
			data: {
				type: 4,
				data: newData,
			},
		});
	}
}

export type slashCommandCallback = (interaction: SlashCommandInteraction) => Promise<void>;

export class DiscordClient extends Client {
	slashCommands: Object<slashCommandCallback>;
	commands: Object<any>;
	prefix: string;
	settings: any;
	leveling: any;
	logging: any;
	listeners: any;
	constructor(options) {
		super(options);
		this.slashCommands = {};
	}

	get _api() {
		// @ts-ignore
		return this.api as any;
	}

	get application() {
		return this._api.applications(this.user.id);
	}

	getApp(guildId: string) {
		let app = this.application;
		if (guildId) {
			app = app.guilds(guildId);
		}
		return app;
	}

	async getSlashCommands(guildId: string) {
		return this.getApp(guildId).commands.get();
	}

	async registerSlashCommand(details: SlashCommandOptions, callback: slashCommandCallback) {
		const guilds = this.guilds.cache.array();
		this.slashCommands[details.name] = callback;
		for (const guild of guilds) {
			try {
				await this.getApp(guild.id).commands.post({ data: details });
			} catch (err) {
				log(err, { error: true, writeToConsole: true });
			}
		}
	}

	slashCommandHandler() {
		this.ws.on("INTERACTION_CREATE" as any, async interaction => {
			if (interaction.type !== 2) return;
			const interactionObject = new SlashCommandInteraction(interaction, this);

			this.slashCommands[interactionObject.name](interactionObject);
			// if (command === "ping") {
			// 	let pingembed = new MessageEmbed()
			// 		.setTitle(`🏓 Pong!`)
			// 		.addFields({ name: `${this.user.username}'s Ping:`, value: `${Math.round(this.ws.ping)}ms` });
			// }
		});
	}
}
