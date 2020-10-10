const admin = require("firebase-admin");

module.exports = async (reaction, user) => {
    const message = reaction.message
    const guild = message.guild
    const member = guild.members.resolve(user)
    const guildRef = admin.firestore().collection("reactionRoles").doc(guild.id)
    const guildDB = await guildRef.get()
    const guildData = guildDB.data()
    const reactionRoleMessage = guildData[message.id] 
    if(!reactionRoleMessage) return 
    let roleToGiveId = reactionRoleMessage.roles[reaction.emoji.id]
    if(!roleToGiveId) roleToGiveId = reactionRoleMessage.roles["catch-all"]
    const toggle = reactionRoleMessage.toggle
    const roleToGive = await guild.roles.fetch(roleToGiveId)
    return {roleToGive, toggle}
}