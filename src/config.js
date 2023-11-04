export const prefix = process.env.PREFIX;
export const devs = JSON.parse(process.env.DEVS ?? "[]");

if (typeof prefix !== "string") throw new Error("Config#prefix must be a string.");
if (!devs.length) console.warn("[WARN] No developers have been specified.");
