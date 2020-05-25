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

        switch (args[0]) {
            case 'prefix':
                this.handlePrefix(db, server, message, cmd, args);
                return;
        }
        
        this.showHelp(server, message);
    }

    showHelp(server: Server, message: Discord.Message) {
        message.reply(`Use "${server.prefix}sanctum prefix <prefix>" to change the default prefix to something else`);
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