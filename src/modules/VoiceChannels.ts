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
                        if (
                            oldState.channel != null &&
                            oldState.channel.parent != null &&
                            oldState.channel.parent.id == server.voiceCategoryId && 
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
            new Command('voice', 'Allows you to create voice channels (you need to be in a voice channel to do so)'),
            new Command('voicemanager', 'Providing a channelId will allow you to set the category to create voice channels in')
        ]
    }

    handleCommand(db: Db, server: Server, msg: Discord.Message, cmd: Command, args: String[]) {
        if (cmd.command === 'voicemanager') {
            this.handleCategory(db, server, msg, cmd, args);
        } else if (cmd.command === 'voice') {
            this.handleVoice(db, server, msg, cmd, args);
        }
    }

    handleCategory(db: Db, server: Server, msg: Discord.Message, cmd: Command, args: String[]) {
        if (args.length < 1) {
            msg.reply('You need to provide a valid categoryId (Right click a category -> Copy ID), or "clear" to clear it');
            return;
        }

        if (args[0] == "clear") {
            server.voiceCategoryId = null;
            server.update(db);
            return;
        }

        let channel = msg.guild.channels.resolve(args.join(' '));
        if (channel === null || channel.type !== 'category') {
            msg.reply('You need to provide a valid categoryId (Right click a category -> Copy ID), or "clear" to clear it');
            return;
        }

        server.voiceCategoryId = channel.id;
        server.update(db)
            .then(
                () => {
                    console.debug(`Set category "${channel.name}" as voice category on server "${channel.guild.name}"`);
                    msg.reply("Linked category");
                },
                err => msg.reply(`Something went wrong: ${err}`)
            );
    }

      handleVoice(db: Db, server: Server, msg: Discord.Message, cmd: Command, args: String[]) {
        if (msg.member.voice.channelID === undefined) {
            msg.reply('You must be in a voice channel to create a custom one');
            return;
        }
        
        if (args.length < 1) {
            msg.reply(`You need to provide a name for your channel!`);
            return;
        }
        
        let channelName = args.join(' '); 
        let parentChannel = msg.guild.channels.resolve(server.voiceCategoryId);

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
}