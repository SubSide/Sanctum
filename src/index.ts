require('dotenv').config();

import Discord from "discord.js";
import {AbstractModule} from "./core/AbstractModule";
import {Command} from './core/Command';
import MongoDb, { Db } from "mongodb";
import { Server } from "./models/Server";
import { Sanctum } from "./modules/Sanctum";

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const modules: AbstractModule[] = [];

const sanctumModule = new Sanctum();

const modulePaths = [
    './modules/VoiceChannels.js'
];


// Create database
const connection = MongoDb.MongoClient.connect(MONGODB_URL, { useUnifiedTopology: true })
.then(
    conn => {
        let db = conn.db(MONGODB_DB);
        return new Promise<Db>((resolve, reject) => {
            db.createCollection("servers")
            .then(
                _ => resolve(db),
                err => reject(err)
            )
        })
    },
    error => console.debug("Error connecting to mongodb: "+error)
)
.then(
    db => {
        const bot = new Discord.Client();
        // Login the bot
        bot.login(DISCORD_TOKEN);


        // Create and add all the modules
        modules.push(sanctumModule);
        modulePaths.forEach(path => {
            let module = require(path);
            modules.push(new (module[Object.keys(module)[0]])())
        });

        // Initialize all the modules
        modules.forEach(module => module.init(bot, db as Db));

        bot.on('ready', () => {
            console.info(`Logged in as ${bot.user.tag}!`);
        });

        bot.on('guildDelete', guild => {
            (db as Db).collection('servers').deleteOne({ guildId: guild.id });
            console.debug(`We got deleted from "${guild.name}" so we're removing it from our database.`);
        });

        bot.on('message', msg => {
            Server.get(db as Db, msg.guild.id).then(
                server => {
                    // This looks a bit out of place, but We add this so if a user ever screws up 
                    // his prefix, he can always use the ! version
                    if (msg.content.startsWith("!sanctum") && msg.member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
                        const args = msg.content.trim().split(' ');
                        const command = args.shift().toLowerCase().substr(server.prefix.length);
                        sanctumModule.handleCommand(db as Db, server, msg, sanctumModule.commands[0], args);
                        return;
                    }
                    // We check if it is the correct prefix
                    if (msg.content.startsWith(server.prefix)) {
                        handleCommand(db as Db, server, msg);
                    }
                },
                err => console.debug(`Error getting the server: ${err}`, err)
            );
        });
    },
    error => console.debug(`Error setting up bot: ${error}`, error)
);



function handleCommand(db: Db, server: Server, msg: Discord.Message) {
    // Create a list of args
    const args = msg.content.trim().split(' ');
    // Pop the first arg as it is our command
    const command = args.shift().toLowerCase().substr(server.prefix.length);

    if (command == 'help') {
        showHelp(server, msg);
        return;
    }


    var module: AbstractModule = null;
    var commandObj: Command = null;

    for (let x = 0; x < modules.length; x++) {
        // If we already found a module we stop immediately
        if (module != null) break;

        // We go over all our commands
        for (let y = 0; y < modules[x].commands.length; y++) {
            // If the command contains our command we set our module and break immediately
            if (modules[x].commands[y].commandList.includes(command)) {
                module = modules[x];
                commandObj = modules[x].commands[y];
                break;
            }
        }
    }

    // If the module exists we want to make it handle our command
    if (modules != null && commandObj != null) {
        if (msg.member.hasPermission(commandObj.permissions)) {
            module.handleCommand(db as Db, server, msg, commandObj, args);
        } else {
            msg.reply('You do not have permission to use this command.');
        } 
    }
}

function showHelp(server: Server, msg: Discord.Message) {
    let user = msg.member;
    let help = [];

    help.push(' ');
    help.push(`${server.prefix}help - Shows this list`);

    modules.forEach(module => {
        module.commands.forEach(cmd => {
            if (user.hasPermission(cmd.permissions)) {
                help.push(`${server.prefix}${cmd.command} - ${cmd.info}`);
            }
        });
    });

    msg.reply(help);
}