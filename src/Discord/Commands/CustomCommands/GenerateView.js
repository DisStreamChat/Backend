module.exports = ({ message, args }) => {
	const view = {
		member: message.member,
		author: message.author,
		time: () => (val, render) => {
			try {
				return new Date().toLocaleTimeString([], { timeZone: val });
			} catch (err) {
				return "Invalid TimeZone";
			}
		},
	};
	// for (let i = 0; i < args.length; i++) {
	// 	view[`arg${i + 1}`] = args[i];
	// }
	return view;
};
