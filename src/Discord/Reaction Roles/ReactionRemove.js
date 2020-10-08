const admin = require("firebase-admin");

module.exports = async (reaction, user) => {
    const message = reaction.message
    const guild = message.guild
    const member = guild.members.resolve(user.id)
    const guildRef = admin.firestore().collection("reactionRoles").doc(guild.id)
    const guildDB = await guildRef.get()
    const guildData = guildDB.data()
    const reactionRoleMessage = guildData[message.id] 
    if(!reactionRoleMessage) return 
    // handle reaction and assign the correct roles
}