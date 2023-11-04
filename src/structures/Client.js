import { systemBus, Message } from "dbus-next";
import { Client as DJSClient, Collection } from "discord.js";
import { Result } from "@sapphire/result";

/**
 * @typedef {{ aliases: string[]; name: string; run: (msg: import("discord.js").Message & { client: Client }, args: import("@sapphire/lexure").ArgumentStream) => any}} Command
 */
export class Client extends DJSClient {
    dbus = systemBus();

    /**
     * @type {Collection<String, Command>}
     */
    commands = new Collection();

    /**
     * @type {Collection<String, String>}
     */
    aliases = new Collection();

    /**
     * @param {import("discord.js").ClientOptions} options
     */

    /**
     * Get all zones
     * @returns {Promise<import("@sapphire/result").Result<string[], import("dbus-next").DBusError>>}
     */
    async getAllZones() {
        const result = await this.callDbusZoneMethods("getZones");
        if (result.isErr()) return result;
        return Result.ok(result.unwrap().body[0]);
    }

    /**
     * Get zone id
     * @param {String} zoneName The zone name
     * @returns {Promise<import("@sapphire/result").Result<{ index: number; name: string }, import("dbus-next").DBusError>>}
     */
    async getZoneId(zoneName) {
        const allZones = await this.getAllZones();
        if (allZones.isErr()) return allZones;

        const zone = allZones.unwrap().find(x => x === zoneName);
        if (!zone) return Result.err(new Error(`"${zoneName}" index not found.`));
        return Result.ok({ index: allZones.unwrap().indexOf(zoneName), name: zoneName });
    }

    /**
     * Get default zone (index and name)
     * @returns {Promise<import("@sapphire/result").Result<{ index: number; name: string }, import("dbus-next").DBusError>>}
     */
    async getDefaultZone() {
        const result = await this.callDbusFirewallDMethods("getDefaultZone");
        if (result.isErr()) return result;

        const defaultZoneId = await this.getZoneId(result.unwrap().body[0]);
        if (defaultZoneId.isErr()) return defaultZoneId;
        return Result.ok(defaultZoneId.unwrap());
    }

    /**
     * Calls org.fedoraproject.FirewallD1 methods
     * @param {String} member The interface's methods
     * @param {any[]}  body The body of the message
     * @param {String} signature Body signature refers to https://github.com/dbusjs/node-dbus-next#the-type-system
     * @returns {Promise<import("@sapphire/result").Result<import("dbus-next").Message, import("dbus-next").DBusError>>}
     */
    callDbusFirewallDMethods(member, body, signature) {
        return Result.fromAsync(() => this.dbus.call(new Message({
            destination: "org.fedoraproject.FirewallD1",
            path: "/org/fedoraproject/FirewallD1",
            interface: "org.fedoraproject.FirewallD1",
            member,
            body,
            signature
        })));
    }

    /**
     * Calls org.fedoraproject.FirewallD1.zone methods (Temporary changes)
     * @param {String} member The interface's methods
     * @param {any[]}  body The body of the message
     * @param {String} signature Body signature refers to https://github.com/dbusjs/node-dbus-next#the-type-system
     * @returns {Promise<import("@sapphire/result").Result<import("dbus-next").Message, import("dbus-next").DBusError>>}
     */
    callDbusZoneMethods(member, body, signature) {
	    return Result.fromAsync(() => this.dbus.call(new Message({
            destination: "org.fedoraproject.FirewallD1",
            path: "/org/fedoraproject/FirewallD1",
            interface: "org.fedoraproject.FirewallD1.zone",
            member,
            body,
            signature
        })));
    }

    /**
     * Calls org.fedoraproject.FirewallD1.config.zone methods (Permanent changes)
     * @param {String} zoneId The zone id (use getAllZones and use the zone's index position)
     * @param {String} member The interface's methods
     * @param {any[]}  body The body of the message
     * @param {String} signature Body signature refers to https://github.com/dbusjs/node-dbus-next#the-type-system
     * @returns {Promise<import("@sapphire/result").Result<import("dbus-next").Message, import("dbus-next").DBusError>>}
     */
    callDbusConfigZoneMethods(zoneId, member, body, signature) {
	    return Result.fromAsync(() => this.dbus.call(new Message({
            destination: "org.fedoraproject.FirewallD1",
            path: `/org/fedoraproject/FirewallD1/config/zone/${zoneId}`,
            interface: "org.fedoraproject.FirewallD1.config.zone",
            member,
            body,
            signature
        })));
    }
}
