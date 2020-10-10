import ReactionAdd from "./ReactionAdd"
import ReactionRemove from "./ReactionRemove"

module.exports = (client) => {
    client.on("messageReactionAdd", ReactionAdd)
    client.on("messageReactionRemove", ReactionRemove)
}