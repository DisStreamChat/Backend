import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async (invite) => {
    const guild = channel.guild;

    let channelId = null;
    const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
    const serverData = serverRef.data();
    if (serverData) {
        channelId = serverData.server;
    }

    // if (!channelId) return;

    console.log(invite)
};