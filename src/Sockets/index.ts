import Server from "socket.io";

import { Logger } from "../utils/functions/logging";
import { addMe } from "./addme";
import { banDiscordUser } from "./banDiscordUser";
import { banTwitchUser } from "./banTwitchUser";
import { deleteDiscordMessage } from "./deleteDiscordMessage";
import { deleteTwitchMessage } from "./deleteTwitchMessage";
import { sendChat } from "./send-chat";
import { timeoutTwitchUser } from "./timeoutTwitchUser";

export const setupSocketServer = (io: Server.Server) => {
	Logger.log("setting up sockets");

	io.origins((_, callback) => {
		callback(null, true);
	});
	io.on("connection", socket => {
		Logger.log("a user connected");
		socket.emit("imConnected");

		// the addme event is sent from the frontend on load with the data from the database
		socket.on("addme", data => addMe(data, socket));

		socket.on("deletemsg - discord", deleteDiscordMessage);

		socket.on("banuser - discord", banDiscordUser);

		socket.on("deletemsg - twitch", deleteTwitchMessage);

		socket.on("timeoutuser - twitch", timeoutTwitchUser);

		socket.on("banuser - twitch", banTwitchUser);

		socket.on("sendchat", sendChat);

		socket.on("disconnect", () => {
			Logger.log("a user disconnected");
			Logger.log(Object.values(socket.rooms).join(", "));
		});
	});
};
