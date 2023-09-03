import MemberAdd from "./GuildMemberAdd";
//@ts-nocheck
import ReactionAdd from "./ReactionAdd";
import ReactionRemove from "./ReactionRemove";

export default client => {
	client.on("messageReactionAdd", (...params) => ReactionAdd(...params, client));
	client.on("messageReactionRemove", (...params) => ReactionRemove(...params, client));
	client.on("guildMemberAdd", (...params) => MemberAdd(...params, client));
};
