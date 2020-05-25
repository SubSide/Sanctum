export class Command {
    
    public commandList: String[];

    constructor(
        public command: String, 
        public info: String, 
        public aliases: String[] = [],
        public permissions: number = 0
    ) {
        this.commandList = [...aliases];
        this.commandList.unshift(command);
    }
}