import { IntentsBitField, ChannelType } from "discord.js";
import { Client } from "./structures/Client.js";
import { Parser, PrefixedStrategy, Lexer, ArgumentStream } from "@sapphire/lexure";
import { devs, prefix } from "./config.js";
import { join } from "path";
import { readdirSync } from "fs";
import { Result } from "@sapphire/result";

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessages
    ],
    allowedMentions: {
        parse: ["users"],
        repliedUser: false
    }
});

client.on("ready", async () => {
    console.info(`Logged in as ${client.user.tag}!`);

    for (const file of readdirSync("./src/commands").filter(x => x.endsWith(".js"))) {
        const command = await import(join(process.cwd(), "src", "commands", file));
        console.log(`Loaded command ${command.default.name}`);
        for (const alias of command.default.aliases) client.aliases.set(alias, command.default.name);
        client.commands.set(command.default.name, command.default);
    }
});

client.on("messageCreate", async msg => {
    if (
        !msg.channel.type === ChannelType.DM ||
        !msg.guild ||
        !msg.content.startsWith(prefix) ||
        msg.author.bot ||
        !devs.includes(msg.author.id)
    ) return;

    const args = msg.content.slice(prefix.length).trim();
    const parser = new Parser(new PrefixedStrategy(["--", "/"], ["=", ":"]));
    const lexer = new Lexer({
        quotes: [
            ['"', '"'],
            ["“", "”"],
            ["「", "」"]
        ]
    });

    const stream = new ArgumentStream(parser.run(lexer.run(args)));
    const commandName = stream.single().unwrap();
    const command = client.commands.get(commandName) ?? client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    const result = await Result.fromAsync(() => command.run(msg, stream));
    if (result.isErr()) console.error(result.unwrapErr());
});

await client.login();
