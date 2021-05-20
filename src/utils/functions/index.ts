//@ts-ignore
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import Discord, { Client, PresenceData } from "discord.js";
import { readdirSync, statSync } from "fs";
import { join } from "path";

export * from "./svgFunctions";
export * from "./settingFunctions";
export * from "./moderationFuntions";
export * from "./levelingFunctions";
export * from "./permissionFunctions";
export * from "./DiscordFunctions";

//@ts-ignore
String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

export const walkSync = (files, fileDir, fileList = []) => {
	for (const file of files) {
		const absolutePath = join(fileDir, file);
		if (statSync(absolutePath).isDirectory()) {
			const dir = readdirSync(absolutePath);
			walkSync(dir, absolutePath, fileList);
		} else {
			fileList.push({ name: file, path: absolutePath });
		}
	}
	return fileList;
};

export const cleanRegex = function (str: string): string {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

export const Random = (min: number | any[], max?: number): any => {
	if (Array.isArray(min)) {
		return min[Math.floor(min.length * Math.random())];
	}
	if (!max && min) {
		return Random(0, min);
	}
	return Math.random() * (max - min) + min;
};

export const hoursToMillis = (hrs: number) => hrs * 3600000;

export const sleep = async (millis: number) => new Promise(resolve => setTimeout(resolve, millis));

export const setArray = items => (items ? (Array.isArray(items) ? items : [items]) : []);

export const isNumeric = value => {
	return /^-?\d+[.\,]?\d*$/.test(value);
};

export const convertDiscordRoleColor = (color: string): string => (color === "#000000" ? "#FFFFFF" : color);

export const formatFromNow = time => formatDistanceToNow(time, { addSuffix: true });

interface DiscordActivity {
	type: string;
	name: string;
}
interface DiscordStatus extends Omit<PresenceData, "activity"> {
	activity: PresenceData["activity"] | ((client: Client) => PresenceData["activity"]);
}

export const cycleBotStatus = (bot: Client, statuses: DiscordStatus[], timeout: number) => {
	const setStatus = (status: DiscordStatus) => {
		if (typeof status.activity === "function") {
			return bot.user.setPresence({ ...status, activity: status.activity(bot) });
		}
		bot.user.setPresence(status as PresenceData);
	};

	let currentStatus = 0;
	setStatus(statuses[currentStatus]);

	setInterval(() => {
		currentStatus += 1;
		currentStatus = currentStatus % statuses.length;
		const status = statuses[currentStatus];
		setStatus(status);
	}, timeout);
};

export const isObject = (val: any): boolean => typeof val === "object" && val; // required for "null" comparison

export function compare(obj1 = {}, obj2 = {}, deep?: boolean) {
	const output = {},
		merged = { ...obj1, ...obj2 }; // has properties of both

	for (const key in merged) {
		const value1 = obj1[key],
			value2 = obj2[key];

		// recursively call
		if ((isObject(value1) || isObject(value2)) && deep) output[key] = compare(value1, value2);
		else output[key] = value1 === value2;
	}

	return output;
}
