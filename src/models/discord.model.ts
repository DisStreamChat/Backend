import Discord from "discord.js";

export interface ChannelModel {
	id: string;
	name: string;
	parent: string;
}

export interface RoleModel {
	color: number;
	deleted: boolean;
	guild: string;
	hoist: boolean;
	managed: boolean;
	mentionable: boolean;
	name: string;
	permissions: number | string[];
	position: string;
	rawPosition: string;
}

export interface CustomClient extends Discord.Client {
	
}
