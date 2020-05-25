import Discord from 'discord.js';
import {Command} from '../core/Command';
import {Server} from '../models/Server';
import {Db} from 'mongodb';

export abstract class AbstractModule {
    public commands: Command[];

    constructor() {
        this.commands = this.getCommands();
    }

    public init(discordBot: Discord.Client, db: Db){}

    public abstract getCommands(): Command[];
    public abstract handleCommand(db: Db, server: Server, message: Discord.Message, cmd: Command, args: String[]): void;
}