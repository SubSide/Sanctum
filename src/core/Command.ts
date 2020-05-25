import Discord from "discord.js";

export class Command {
    
    public commandList: String[];

    constructor(
        public command: String, 
        public info: String, 
        public aliases: String[] = [],
        public permissions: number = Discord.Permissions.FLAGS.ADMINISTRATOR
    ) {
        this.commandList = [...aliases];
        this.commandList.unshift(command);
    }
}