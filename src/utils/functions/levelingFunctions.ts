export const getRoleScaling = (roles, scaling) => {
	const sortedRoles = roles.sort((a, b) => -1 * a.comparePositionTo(b));
	for (const role of sortedRoles) {
		const scale = scaling?.[role.id];
		if (scale != undefined) return scale;
	}
};

export const max = (...args: number[]): number => {
	return args.reduce((a, b) => a > b ? a : b)
};

export const floor = (number: number): number => {
	return number | 0
}

export const abs = (number: number): number => {
	return number < 0 ? -number : number
}


export const getLevel = xp => max(0, floor(Math.log(xp - 100)));

export const getXp = level => (5 / 6) * level * (2 * level * level + 27 * level + 91);
