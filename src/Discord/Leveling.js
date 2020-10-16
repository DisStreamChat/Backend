// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { Random, ArrayAny } = require("../utils/functions");

const { getXp } = require("../utils/functions");

const getRoleScaling = (roles, scaling) => {
	const sortedRoles = roles.sort((a, b) => -1 * a.comparePositionTo(b));
	for (const role of roles) {
		const scale = scaling?.[role.id];
		if (scale != undefined) return scale;
	}
};

module.exports = {
	handleLeveling: async message => {
		const settings = (await admin.firestore().collection("DiscordSettings").doc(message.guild.id).get()).data();
		if (!settings?.activePlugins?.leveling) return;
		const levelingRef = admin.firestore().collection("Leveling").doc(message.guild.id);
		const levelingDataRef = await levelingRef.get();
		const levelingSettingsRef = await levelingRef.collection("settings").get();
		const levelingSettings = levelingSettingsRef.docs.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.data() }), {});
		const levelingData = levelingDataRef.data();
		if (levelingData) {
			const channel = message.channel;
			const channelsToIgnore = levelingSettings?.bannedItems?.channels || [];
			if (channelsToIgnore.includes(channel.id)) return;
			const rolesToIgnore = levelingSettings?.bannedItems?.roles || [];
			const member = message.member;
			if (
				ArrayAny(
					rolesToIgnore,
					member.roles.cache.array().map(role => role.id)
				)
			)
				return;
			const generalScaling = levelingSettings?.scaling?.general;
			const roleScaling = getRoleScaling(member.roles.cache.array(), levelingSettings?.scaling?.roles || {});
			const finalScaling = roleScaling ?? generalScaling ?? 1;
			const levelingChannelId = levelingData.type === 3 ? levelingData.notifications || message.channel.id : message.channel.id;
			let userLevelingData = levelingData[message.author.id];
			if (!userLevelingData) {
				userLevelingData = { xp: 0, level: 0, cooldown: 0 };
			}
			const now = new Date().getTime();
			const cooldownTime = 60000;
			const expireTime = userLevelingData.cooldown + cooldownTime;
			if (now > expireTime) {
				userLevelingData.cooldown = now;
				userLevelingData.xp += Random(10, 20) * finalScaling;
				userLevelingData.xp = Math.floor(userLevelingData.xp);
				let xpToNextLevel = getXp(userLevelingData.level + 1);
				if (userLevelingData.xp >= xpToNextLevel) {
					userLevelingData.level++;
					if (levelingData.type !== 1) {
						const levelupMessage = (levelingData.message || "Congrats {player}, you leveled up to level {level}")
							.replace("{ping}", message.author)
							.replace("{player}", message.member.displayName)
							.replace("{level}", userLevelingData.level + 1);
						try {
							const levelingChannel = await message.guild.channels.resolve(levelingChannelId);
							levelingChannel.send(levelupMessage);
						} catch (err) {
							message.channel.send(levelupMessage);
						}
					}
				}
				levelingData[message.author.id] = userLevelingData;
				await admin.firestore().collection("Leveling").doc(message.guild.id).update(levelingData);
			}
		} else {
			try {
				await admin.firestore().collection("Leveling").doc(message.guild.id).update({});
			} catch (err) {
				await admin.firestore().collection("Leveling").doc(message.guild.id).set({});
			}
		}
	},
};
