module.exports = ({message, args}) => {
    const view = {
        member: message.member,
        author: message.author
    };
	for (let i = 0; i < args.length; i++) {
		view[`arg${i + 1}`] = args[i];
    }
    return view
}