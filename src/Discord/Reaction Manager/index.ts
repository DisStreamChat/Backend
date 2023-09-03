import MemberAdd from "./GuildMemberAdd";
//@ts-nocheck
import ReactionAdd from "./ReactionAdd";
import ReactionRemove from "./ReactionRemove";

export default client => {
	client.on("messageReactionAdd", (...params) => ReactionAdd.apply(null, ...[...params, client]));
	client.on("messageReactionRemove", (...params) => ReactionRemove.apply(null, ...[...params, client]));
	client.on("guildMemberAdd", (...params) => MemberAdd.apply(null, ...[...params, client]));
};
