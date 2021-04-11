const formatDistanceToNow = require("date-fns/formatDistanceToNow");

const fs = require("fs");
const path = require("path");

import canvasFunctions from "./canvasFunctions";
import settingsFunctions from "./settingFunctions";
import moderationFunctions from "./moderationFuntions";
import levelingFunctions from "./levelingFunctions";
import permissionFunctions from "./permissionFunctions";
import discordFunctions from "./DiscordFunctions";

String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

const walkSync = (files, fileDir, fileList = []) => {
	for (const file of files) {
		const absolutePath = path.join(fileDir, file);
		if (fs.statSync(absolutePath).isDirectory()) {
			const dir = fs.readdirSync(absolutePath);
			walkSync(dir, absolutePath, fileList);
		} else {
			fileList.push({ name: file, path: absolutePath });
		}
	}
	return fileList;
};

const cleanRegex = function (str) {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

const Random = (min, max) => {
	if (Array.isArray(min)) {
		return min[Math.floor(min.length * Math.random())];
	}
	if (!max && min) {
		return Random(0, min);
	}
	return Math.random() * (max - min) + min;
};

const hoursToMillis = hrs => hrs * 3600000;

const sleep = async millis => new Promise(resolve => setTimeout(resolve, millis));

const setArray = items => (items ? (Array.isArray(items) ? items : [items]) : []);

const isNumeric = value => {
	return /^-?\d+[.\,]?\d*$/.test(value);
};

const convertDiscordRoleColor = color => (color === "#000000" ? "#FFFFFF" : color);

const formatFromNow = time => formatDistanceToNow(time, { addSuffix: true });

const cycleBotStatus = (bot, statuses, timeout) => {
	const setStatus = status => {
		if (typeof status === "function") {
			return bot.user.setPresence(status());
		}
		bot.user.setPresence(status);
	};

	let currentStatus = 0;
	setStatus(statuses[currentStatus]);

	setInterval(() => {
		currentStatus += 1;
		currentStatus = currentStatus % statuses.length;
		setStatus(statuses[currentStatus]);
	}, timeout);
};

const isObject = val => typeof val === "object" && val; // required for "null" comparison

function compare(obj1 = {}, obj2 = {}, deep) {
	const output = {},
		merged = { ...obj1, ...obj2 }; // has properties of both

	for (const key in merged) {
		const value1 = obj1[key],
			value2 = obj2[key];

		if ((isObject(value1) || isObject(value2)) && deep) output[key] = compare(value1, value2);
		// recursively call
		else output[key] = value1 === value2;
	}

	return output;
}

module.exports = {
	...canvasFunctions,
	...settingsFunctions,
	...permissionFunctions,
	...moderationFunctions,
	...levelingFunctions,
	...discordFunctions,
	// get,
	compare,
	convertDiscordRoleColor,
	formatFromNow,
	isNumeric,
	walkSync,
	Random,
	cleanRegex,
	hoursToMillis,
	sleep,
	setArray,
	cycleBotStatus,
};
