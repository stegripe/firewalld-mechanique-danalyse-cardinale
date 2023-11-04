import { stripIndents } from "common-tags";
import { Colors, EmbedBuilder } from "discord.js";
import { prefix } from "../config.js";
import { codeBlock } from "@sapphire/utilities";
import checkIp from "check-ip";

/**
 * @type {import("../structures/Client").Command}
 */
export default {
    aliases: ["fw"],
    name: "firewall",
    run: async (msg, args) => {
        if (!args.results.flags.size && !args.results.options.size) {
            return sendHelp(msg);
        }

        const forwardPortsToAdd = args.options("add-forward-port").unwrapOr([]);
        const forwardPortsToRemove = args.options("remove-forward-port").unwrapOr([]);

        const zoneRaw = args.option("zone").unwrapOr(undefined);
	    const zoneResult = zoneRaw === undefined
            ? await msg.client.getDefaultZone()
            : await msg.client.getZoneId(zoneRaw);

        if (zoneResult.isErr()) {
            return throwDbusError(msg, zoneResult.unwrapErr());
        }

        const zone = zoneResult.unwrap();
        const isPermanent = args.flag("permanent");
        const timeout = Number(args.option("timeout").unwrapOr(undefined) ?? 5);

        if (timeout && isNaN(timeout)) {
            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Red)
                        .setAuthor({
                            name: "Invalid Timeout",
                            iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                        })
                        .setDescription("The timeout must be a number in minutes")
                        .setTimestamp()
                ]
            });
        }

        if (args.flag("list-forward-ports")) {
            const result = await msg.client.callDbusZoneMethods("getForwardPorts", [zone.name], "s");
            if (result.isErr()) {
                return throwDbusError(msg, result.unwrapErr());
            }

            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setAuthor({
                            name: "List Forward Ports",
                            iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                        })
                        .setDescription(codeBlock(
                            result.unwrap().body[0]
                                .map(x => `port=${x[0]}:proto=${x[1]}:toport=${x[2]}:toaddr=${x[3]}`).join("\n")
                        ))
                        .setTimestamp()
                ]
            });
        }

        if (args.flag("list-zones")) {
            const result = await msg.client.getAllZones();
            if (result.isErr()) {
                return throwDbusError(msg, result.unwrapErr());
            }

            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setAuthor({
                            name: "List All Zones",
                            iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                        })
                        .setDescription(codeBlock(
                            result.unwrap()
                                .join(", ")
                        ))
                        .setTimestamp()
                ]
            });
        }

        if (forwardPortsToAdd.length || forwardPortsToRemove.length) {
            // Validate the syntax
            const forwardedPorts = forwardPortsToAdd.map(x => x.split(":"));
            const removedForwardPorts = forwardPortsToRemove.map(x => x.split(":"));
            const forwardResults = [];
            const removeResults = [];

            if (forwardedPorts.concat(removedForwardPorts).some(x => x.length !== 4)) return throwForwardPortFormatError(msg, "Invalid format (Missing ports or ip).");
            for (const rawPorts of forwardedPorts.concat(removedForwardPorts)) {
                const [port, proto, toport, toaddr] = rawPorts;
                if (isNaN(port) || isNaN(toport)) return throwForwardPortFormatError(msg, "Invalid port (Any port must be a number).");
                if (!["tcp", "udp"].includes(proto)) return throwForwardPortFormatError(msg, "Invalid protocol (Protocol must be tcp or udp).");
                if (!checkIp(toaddr).isValid) return throwForwardPortFormatError(msg, "Invalid IP address (IP address must be a valid IPv4 format).");
            }

            // Add forward ports
            if (forwardPortsToAdd.length) {
                for (const rawPorts of forwardedPorts) {
                    const [port, proto, toport, toaddr] = rawPorts;
                    const result = isPermanent
                        ? await msg.client.callDbusConfigZoneMethods(zone.index, "addForwardPort", [port, proto, toport, toaddr], "ssss")
                        : await msg.client.callDbusZoneMethods("addForwardPort", [zone.name, port, proto, toport, toaddr, timeout * 60], "sssssi");

                    if (result.isErr()) {
                        forwardResults.push(`❌ ${result.unwrapErr().message}`);
                        continue;
                    }

                    forwardResults.push(`✅ ${port}:${proto}:${toport}:${toaddr}`);
                }
            }

            if (forwardPortsToRemove.length) {
                for (const rawPorts of removedForwardPorts) {
                    const [port, proto, toport, toaddr] = rawPorts;
                    const result = isPermanent
                        ? await msg.client.callDbusConfigZoneMethods(zone.index, "removeForwardPort", [port, proto, toport, toaddr], "ssss")
                        : await msg.client.callDbusZoneMethods("removeForwardPort", [zone.name, port, proto, toport, toaddr], "ssssi");

                    if (result.isErr()) {
                        removeResults.push(`❌ ${result.unwrapErr().message}`);
                        continue;
                    }

                    removeResults.push(`✅ ${port}:${proto}:${toport}:${toaddr}`);
                }
            }

            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setAuthor({
                            name: "Forward Ports",
                            iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                        })
                        .setDescription(stripIndents`
                            ${forwardResults.length
        ? `## Added Rules
                                ${codeBlock(
        forwardResults.join("\n")
    )}`
        : ""
}
                            ${removeResults.length
        ? `## Removed Rules
                                ${codeBlock(
        removeResults.join("\n")
    )}`
        : ""
}
                        `)
                        .setTimestamp()
                ]
            });
        }

        if (args.flag("reload")) {
            const result = await msg.client.callDbusFirewallDMethods("reload");
            if (result.isErr()) {
                return throwDbusError(msg, result.unwrapErr());
            }

            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setDescription("✅ **|** Reloaded the firewall. Permanent changes have been aplied. Runtime changes have been discarded.")
                        .setTimestamp()
                ]
            });
        }

        if (args.flag("runtime-to-permanent")) {
            const result = await msg.client.callDbusFirewallDMethods("runtimeToPermanent");
            if (result.isErr()) {
                return throwDbusError(msg, result.unwrapErr());
            }

            return msg.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Green)
                        .setDescription("✅ **|** All runtime changes have been applied.")
                        .setTimestamp()
                ]
            });
        }

        return sendHelp(msg);
    }
};

/**
 * @param {import("discord.js").Message} msg
 * @param {import("dbus-next").DBusError} err
 * @returns
 */
function throwDbusError(msg, err) {
    return msg.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(Colors.Red)
                .setAuthor({
                    name: "D-Bus Error",
                    iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                })
                .setDescription(codeBlock(err))
                .setTimestamp()
        ]
    });
}

function throwForwardPortFormatError(msg, err) {
    return msg.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(Colors.Red)
                .setAuthor({
                    name: "Invalid Port Forwarding Format",
                    iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                })
                .setDescription(`The correct format is \`port:proto:toport:toaddr\` e.g: \`80:tcp:80:192.168.0.1\`. Please review your syntax.\n${codeBlock(err)}`)
                .setTimestamp()
        ]
    });
}

function sendHelp(msg) {
    msg.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(Colors.Red)
                .setAuthor({
                    name: "Command Usage",
                    iconURL: msg.guild.iconURL({ extension: "png", size: 4096 })
                })
                .setDescription(`
## USAGE
${codeBlock(`${prefix}firewall [options]`)}
## OPTIONS
${codeBlock(`--list-forward-ports
List all forward ports

--list-zones
List all zones

--add-forward-port=port:proto:toport:toaddr
Add a new forward port rules. Example: \`80:tcp:80:192.168.0.18\`

--remove-forward-port=port:proto:toport:toaddr
Remove a forward port rules. Example: \`80:tcp:80:192.168.0.18\`

--reload
Reload the firewall (make the permanent changes aplied and runtime changes discarded)

--runtime-to-permanent
The runtime changes (non-permanent) will be made permanent

--permanent
Mark your changes to permanent (default: false)

--zone=zoneName
Specify a zone (default to current active default zone)

--timeout=numberInMinutes
The timeout in minutes. This is intended for non-runtime changes so that any non-permanent changes will be discarded after the timeout reaches. (default: 5 minutes)

--help
    Show this message
`)}
                `)
                .setTimestamp()
        ]
    });
}
