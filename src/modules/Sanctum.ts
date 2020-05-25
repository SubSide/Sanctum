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


    handleCommand(db: Db, server: Server, message: Discord.Message, cmd: Command, args: String[]) {
        if (cmd.command !== 'sanctum') return;

        if (args.length < 1) {
            return;
        }
    }
}