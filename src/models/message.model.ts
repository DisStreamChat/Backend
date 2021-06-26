export interface BaseMessageModel {
	displayName: string;
	avatar: string;
	body: string;
	platform: "twitch" | "discord";
	id: string;
	badges?: {
		[key: string]: {
			image: string;
			title: string;
		};
	};
	sentAt: number;
	userColor: string;
	type: string;
	channel: string;
}

export interface DiscordMessageModel extends BaseMessageModel {
	username: string;
	userId: string;
}

export interface TwitchMessageModel extends BaseMessageModel {
	replyParentDisplayName?: string;
	replyParentMessageBody?: string;
	replyParentMessageId?: string;
	replyParentMessageUserId?: string;
	highlightedMessageId?: string;
	messageType?: string;
}

export type GenericMessageType = DiscordMessageModel | TwitchMessageModel;

export type MessageMap = Map<string, GenericMessageType>;
