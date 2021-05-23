//@ts-ignore
export const escapePings = (text: string) => text.replaceAll("@", "@‍");

export const unescapeHTML = (text: string) => text.replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");

export const transformTwitchUsername = (name: string) => (!name.startsWith("#") ? name : name.substring(1));
