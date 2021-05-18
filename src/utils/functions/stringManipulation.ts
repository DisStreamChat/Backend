//@ts-ignore
export const escapePings = (text: string) => text.replaceAll("@", "@‍");

export const unescapeHTML = (text: string) => text.replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
