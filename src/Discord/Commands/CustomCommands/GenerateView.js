module.exports = ({message, args}) => {
    const view = {
        member: message.member,
        author: message.author,
        time: () => new Date().toLocaleTimeString(),
    };
	for (let i = 0; i < args.length; i++) {
		view[`arg${i + 1}`] = args[i];
    }
    return view
}