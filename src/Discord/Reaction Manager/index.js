import ReactionAdd from "./ReactionAdd";
import ReactionRemove from "./ReactionRemove";
import MemberAdd from "./GuildMemberAdd";

module.exports = client => {
	client.on("messageReactionAdd", (...params) => ReactionAdd(...params, client));
	client.on("messageReactionRemove", (...params) => ReactionRemove(...params, client));
	client.on("guildMemberAdd", (...params) => MemberAdd(...params, client));
};
