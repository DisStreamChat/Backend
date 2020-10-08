
module.exports = (reaction, user) => {
    const message = reaction.message
    const guild = message.guild
    const member = guild.members.resolve(user)
    const guildRef = admin.firestore().collection("reactionRoles").doc(guild.id)
    const guildDB = await guildRef.get()
    const guildData = guildDB.data()
    const reactionRoleMessage = guildData[message.id] 
    if(!reactionRoleMessage) return 
    const roleToGiveId = reactionRoleMessage.roles[reaction.emoji.id]
    const roleToGive = await guild.roles.fetch(roleToGiveId)
    if(!roleToGive) return 
}