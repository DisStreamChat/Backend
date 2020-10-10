import ReactionAdd from "./ReactionAdd"
import ReactionRemove from "./ReactionRemove"
import MemberAdd from "./GuildMemberAdd"

module.exports = (client) => {
    client.on("messageReactionAdd", ReactionAdd)
    client.on("messageReactionRemove", ReactionRemove)
    client.on("GuildMemberAdd", MemberAdd)
}