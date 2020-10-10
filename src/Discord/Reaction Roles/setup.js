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
    let action = reactionRoleMessage.actions[reaction.emoji.id]
    if(!action) action = reactionRoleMessage.actions["catch-all"]
    if(!action) return
    const roleToGive = action.role
    const roleToGive = await guild.roles.fetch(roleToGiveId)
    return {roleToGive, ...action}
}

/*
action = {
    role: role id that is handled by this action
}

*/