import Discord from 'discord.js';
import {AbstractModule} from '../core/AbstractModule';
import {Command} from '../core/Command';
import {Server} from '../models/Server';
import { Db } from 'mongodb';


export class VoiceChannels extends AbstractModule {
    init(bot: Discord.Client, db: Db) {
        bot.on('voiceStateUpdate', (oldState: Discord.VoiceState, newState: Discord.VoiceState) => {
            Server.get(db, oldState.guild.id)
                .then(
                    server => {
                        let settings = server.settings("voice");
                        if (
                            oldState.channel != null &&
                            oldState.channel.parent != null &&
                            oldState.channel.id != settings.voiceJoinChannelId &&
                            oldState.channel.parent.id == settings.voiceCategoryId && 
                            oldState.channel.members.size < 1
                        ) {
                            let channelName = oldState.channel.name;
                            
                            oldState.channel.delete("Last player left").then(
                                () => console.debug(`Deleted channel "${channelName}" in server "${oldState.guild.name}" as the last player left.`),
                                err => console.debug(`Couldn't delete the channel: ${err}`, err)
                            );
                        }
                    },
                    err => console.debug(`Couldn't get the server. Error ${err}`)
                )
        })
    }

    getCommands() {
        return [
            new Command('voicemanager', 'Providing a channelId will allow you to set the category to create voice channels in'),
            new Command('voice', 'Allows you to create voice channels (you need to be in a voice channel to do so)', [], 0)
        ]
    }

    handleCommand(db: Db, server: Server, msg: Discord.Message, cmd: Command, args: string[]) {
        if (cmd.command === 'voicemanager') {
            this.handleManager(db, server, msg, args);
        } else if (cmd.command === 'voice') {
            this.handleVoice(db, server, msg, cmd, args);
        }
    }

    handleVoice(db: Db, server: Server, msg: Discord.Message, cmd: Command, args: string[]) {
        let settings = server.settings("voice");

        if (settings.voiceCategoryId == null) {
            msg.reply('The server admins haven\'t set a voice category yet!');
            return;
        }

        if (settings.fromCategoryOnly && (
            msg.channel.type != "text" || 
            msg.channel.parent == null || 
            msg.channel.parent.id != settings.voiceCategoryId
        )) {
            return;
        }

        if (settings.voiceJoinChannelId != null && (
                msg.member.voice == null ||
                msg.member.voice.channelID == null ||
                settings.voiceJoinChannelId != msg.member.voice.channelID
        )) {
            let joinChannel = msg.guild.channels.resolve(settings.voiceJoinChannelId);
            msg.reply(`You must be connected to "${joinChannel.name}" to create a custom voice channel!`);
            return;
        }

        if (msg.member.voice == null || msg.member.voice.channelID == null) {
            msg.reply('You must be in a voice channel to create a custom one');
            return;
        }
        
        if (args.length < 1) {
            msg.reply(`You need to provide a name for your channel!`);
            return;
        }
        
        let channelName = args.join(' '); 
        let parentChannel = msg.guild.channels.resolve(settings.voiceCategoryId);

        msg.guild.channels.create(channelName, { 
            type: 'voice',
            parent: parentChannel
        }).then(
            channel => {
                console.debug(`Created custom voice channel "${channel.name}" in the server "${channel.guild.name}" for ${msg.member.displayName}`);
                msg.member.voice.setChannel(channel, `Automatically moved to his created channel ${channel}.`);
                msg.reply('A temporary channel has been created for you. It will be deleted once the last person left it.');
            },
            error => msg.reply(`Something went wrong creating a channel for you :( (${error})`)
        );
    }

    handleManager(db: Db, server: Server, msg: Discord.Message, args: string[]) {
        if (args.length < 1) {
            this.showManagerHelp(server, msg);
            return;
        }

        switch(args.shift().toLowerCase()) {
            case 'category':
                this.handleCategory(db, server, msg, args);
                return;
            case 'joinchannel':
                this.handleJoinChannel(db, server, msg, args);
                return;
            case 'fromcategoryonly':
                this.handleCategoryOnly(db, server, msg, args);
                return;
        }

        this.showManagerHelp(server, msg);
    }

    showManagerHelp(server: Server, msg: Discord.Message) {
        msg.reply([
            ``,
            `${server.prefix}voicemanager category <categoryId|clear>`,
            `${server.prefix}voicemanager joinChannel <channelId|clear>`,
            `${server.prefix}voicemanager fromCategoryOnly <true|false>`
        ])
    }

    handleCategoryOnly(db: Db, server: Server, msg: Discord.Message, args: string[]) {
        if (args.length < 1 || (args[0] != "true" && args[0] != "false")) {
            msg.reply(`Usage: ${server.prefix}voicemanager fromCategoryOnly <true|false>`);
            return;
        }
        
        let fromCategoryOnly = args[0] == "true";
        server.settings("voice").fromCategoryOnly = fromCategoryOnly;
        server.update(db);

        if (fromCategoryOnly) {
            msg.reply(`${server.prefix}voice can now only be accessed from text channels in the linked category`);
        } else {
            msg.reply(`${server.prefix}voice can now be accessed from everywhere`);
        }
    }


    handleCategory(db: Db, server: Server, msg: Discord.Message, args: string[]) {
        let settings = server.settings("voice");
        if (args.length < 1) {
            msg.reply(`Usage: ${server.prefix}voicemanager category <categoryId|clear>`);
            return;
        }

        if (args[0] == "clear") {
            settings.voiceCategoryId = null;
            server.update(db);
            msg.reply('Cleared the linked category');
            return;
        }

        let channel = msg.guild.channels.resolve(args.join(' '));
        if (channel === null || channel.type !== 'category') {
            msg.reply('You need to provide a valid categoryId (Right click a category -> Copy ID), or "clear" to clear it');
            return;
        }

        settings.voiceCategoryId = channel.id;
        server.update(db)
            .then(
                () => {
                    console.debug(`Set category "${channel.name}" as voice category on server "${channel.guild.name}"`);
                    msg.reply("Linked category");
                },
                err => msg.reply(`Something went wrong: ${err}`)
            );
    }

    handleJoinChannel(db: Db, server: Server, msg: Discord.Message, args: String[]) {
        let settings = server.settings("voice");
        if (args.length < 1) {
            msg.reply(`Usage: ${server.prefix}voicemanager joinChannel <channelId|clear>`);
            return;
        }

        if (args[0] == "clear") {
            settings.voiceJoinChannelId = null;
            server.update(db);
            msg.reply('Cleared the linked join channel');
            return;
        }

        let channel = msg.guild.channels.resolve(args.join(' '));
        if (channel === null || channel.type !== 'voice') {
            msg.reply('You need to provide a valid voice channel id (Right click a voice channel -> Copy ID), or "clear" to clear it');
            return;
        }

        settings.voiceJoinChannelId = channel.id;
        server.update(db)
            .then(
                () => {
                    console.debug(`Set voice channel "${channel.name}" as voice join channel on server "${channel.guild.name}"`);
                    msg.reply("Linked voice channel");
                },
                err => msg.reply(`Something went wrong: ${err}`)
            );
    }
}