//@ts-ignore
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Client } from "discord.js";
import { readdirSync, statSync } from "fs";
import { join } from "path";

import { Duration, setDurationInterval } from "../duration.util";

export * from "./canvasFunctions";
export * from "./settingFunctions";
export * from "./moderationFuntions";
export * from "./levelingFunctions";
export * from "./permissionFunctions";
export * from "../../Discord/DiscordFunctions";

//@ts-ignore
String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

export const walkSync = (
	files: string[],
	fileDir: string,
	fileList: { name: string; path: string }[] = []
) => {
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

export const escapeRegexSpecialCharacters = function (str) {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

export function random(min: number, max: number): number;
export function random(max: number): number;
export function random<T>(items: T[]): T;
export function random<T>(min: number | T[], max?: number): number | T {
	if (Array.isArray(min)) {
		return min[Math.floor(min.length * Math.random())];
	}
	if (!max && min) {
		return random(0, min);
	}
	return Math.random() * (max - min) + min;
}

export function setArray<T>(items: T[] | undefined | T): T[] {
	return items ? (Array.isArray(items) ? items : [items]) : [];
}

export const isNumeric = (value: string): boolean => {
	return /^-?\d+[.\,]?\d*$/.test(value);
};

export function isNumber(value: unknown): value is number {
	return value != null && !Number.isNaN(value);
}

export const convertDiscordRoleColor = (color: string) => (color === "#000000" ? "#FFFFFF" : color);

export const formatFromNow = (time: number | Date) =>
	formatDistanceToNow(time, { addSuffix: true });

export const cycleBotStatus = (bot: Client, statuses, timeout: Duration) => {
	const setStatus = status => {
		if (typeof status === "function") {
			return bot.user.setPresence(status());
		}
		bot.user.setPresence(status);
	};

	let currentStatus = 0;
	setStatus(statuses[currentStatus]);

	setDurationInterval(() => {
		currentStatus += 1;
		currentStatus = currentStatus % statuses.length;
		setStatus(statuses[currentStatus]);
	}, timeout);
};

export function isObject<T>(val: unknown): val is Record<string, T> {
	return typeof val === "object" && !!val; // required for "null" comparison
}

export function compareObjects(
	obj1: Record<string, any> = {},
	obj2: Record<string, any> = {},
	deep?: boolean
) {
	const output = {};
	const merged = { ...obj1, ...obj2 };

	for (const key in merged) {
		const value1 = obj1[key],
			value2 = obj2[key];

		if ((isObject(value1) || isObject(value2)) && deep)
			output[key] = compareObjects(value1, value2);
		else output[key] = value1 === value2;
	}

	return output;
}
