import Discord from "discord.js";
import {AbstractModule} from "../core/AbstractModule";
import {Server} from '../models/Server';
import {Command} from '../core/Command';
import {Db} from 'mongodb';


export class Sanctum extends AbstractModule {
    getCommands(){
        return [
            new Command('sanctum', 'The main command of Sanctum.')
        ]
    }


    handleCommand(db: Db, server: Server, message: Discord.Message, cmd: Command, args: string[]) {
        if (cmd.command !== 'sanctum') return;

        if (args.length < 1) {
            this.showHelp(server, message);
            return;
        }

        switch (args[0].toLowerCase()) {
            case 'prefix':
                this.handlePrefix(db, server, message, cmd, args);
                return;
            case 'maintenance':
                this.handleMaintenance(server, message, args);
                return;
        }
        
        this.showHelp(server, message);
    }

    showHelp(server: Server, message: Discord.Message) {
        message.reply([
            ` `,
            `${server.prefix}sanctum prefix <prefix> - Change the default prefix to something else`
        ]);
    }

    handleMaintenance(server: Server, message: Discord.Message, args: string[]) {
        args.shift(); // Removes the first element
        if (message.member.id !== "133653989215436800") {
            message.reply(`Only bot administrators can use this command`);
            return;
        }

        if (args.length < 1) {
            message.reply([
                ` `,
                `${server.prefix}sanctum maintenance update - Restarts the bot. Update if any are available.`
            ])
            return;
        }

        switch (args[0].toLowerCase()) {
            case 'update':
                console.warn(`Restart is called by ${message.member.user.tag}`);

                message.reply(`Restarting the bot, see you soon :)`).then(() => {
                    process.exit();
                });

                return;
        }
    }

    handlePrefix(db: Db, server: Server, message: Discord.Message, cmd: Command, args: string[]) {
        if (args.length < 2) {
            message.reply(`Usage: ${server.prefix}sanctum prefix <prefix>`);
            return;
        }

        server.prefix = args[1];
        server.update(db);
        message.reply(`Sanctum prefix changed to ${server.prefix}`);
    }
}