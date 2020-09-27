import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async (oldMember, newMember) => {
    const guild = channel.guild;

    let channelId = null;
    const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
    const serverData = serverRef.data();
    if (serverData) {
        channelId = serverData.server;
    }

    // if (!channelId) return;

    console.log(oldMember, newMember)
};