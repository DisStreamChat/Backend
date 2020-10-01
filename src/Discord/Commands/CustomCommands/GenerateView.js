module.exports = ({ message, args }) => {
	const fullArgs = args.join(" ");
	const argObj = {
		urlencode: encodeURIComponent(fullArgs),
		toString: () => fullArgs,
	};
	const view = {
		member: message.member,
		author: message.author,
        me: message.member,
		time: () => (val, render) => {
			const now = new Date();
			try {
				return now.toLocaleTimeString("en-US", { timeZone: val });
			} catch (err) {
				return "`Invalid Timezone`";
			}
		},
		msg: argObj,
		args: argObj
	};
	view.time.value = () => new Date().toLocaleTimeString();
	for (let i = 0; i < args.length; i++) {
		view[`arg${i + 1}`] = {
			urlenclode: encodeURIComponent(args[i]),
			toString: () => args[i],
		};
	}
	return view;
};
