import { Role } from "discord.js";
import { Object } from "../../models/shared.model";

export const getRoleScaling = (roles: Role[], scaling?: Object<number>) => {
	const sortedRoles = roles.sort((a, b) => -1 * a.comparePositionTo(b));
	for (const role of sortedRoles) {
		const scale = scaling?.[role.id];
		if (scale != undefined) return scale;
	}
};

export const getLevel = (xp: number) => Math.max(0, Math.floor(Math.log(xp - 100)));

export const getXp = (level: number) => (5 / 6) * level * (2 * level * level + 27 * level + 91);
