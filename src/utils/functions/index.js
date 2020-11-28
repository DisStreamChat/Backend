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

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0);

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

module.exports = {
	...canvasFunctions,
	...settingsFunctions,
	...permissionFunctions,
	...moderationFunctions,
	...levelingFunctions,
	...discordFunctions,
	convertDiscordRoleColor,
	formatFromNow,
	isNumeric,
	ArrayAny,
	walkSync,
	Random,
	cleanRegex,
	hoursToMillis,
	sleep,
	setArray,
};
