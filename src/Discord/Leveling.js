// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { Random } = require("../utils/functions");

const {getXp} = require("../utils/functions")

module.exports = {
    handleLeveling: async message => {
		const levelingDataRef = await admin.firestore().collection("Leveling").doc(message.guild.id).get();
		const levelingData = levelingDataRef.data();
		if (levelingData) {
			let userLevelingData = levelingData[message.author.id];
			if (!userLevelingData) {
				userLevelingData = { xp: 0, level: 0, cooldown: 0 };
			}
			const now = new Date().getTime();
			const cooldownTime = 60000;
			const expireTime = userLevelingData.cooldown + cooldownTime;
			if (now > expireTime) {
				userLevelingData.cooldown = now;
				userLevelingData.xp += Random(10, 20);
				userLevelingData.xp = Math.floor(userLevelingData.xp);
				let xpToNextLevel = getXp(userLevelingData.level+1)
				if(userLevelingData.xp >= xpToNextLevel){
                    userLevelingData.level++
                    message.channel.send(`Congrats ${message.author}, you leveled up to level ${userLevelingData.level+1}`)
                }
				levelingData[message.author.id] = userLevelingData;
				await admin.firestore().collection("Leveling").doc(message.guild.id).update(levelingData);
			}
		} else {
			await admin.firestore().collection("Leveling").doc(message.guild.id).set({});
		}
	}
}