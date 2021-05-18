import { Socket } from "socket.io";
import { log } from "../utils/functions/logging";

export const getRooms = (socket: Socket) => [...socket.rooms];

export const leaveAllRooms = (socket: Socket) =>
	getRooms(socket).forEach(async room => {
		try {
			await socket.leave(room);
		} catch (err) {
			log(err.message, { error: true });
		}
	});
