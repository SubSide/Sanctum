import { Db } from "mongodb";

export class Server {
    constructor(
        public guildId: string,
        public prefix: string = '!',
        public modules: any = {}
    ) {}


    loadInto(obj: any) {
        this.prefix = obj.prefix;
        this.modules = obj.modules
    }
    
    public settings(module: string): any {
        if (this.modules == null) {
            this.modules = {};
        }
        if (this.modules[module] == null) {
            this.modules[module] = {};
        }

        return this.modules[module];
    }

    public async update(db: Db): Promise<void> {
        return new Promise((resolve, reject) => {
            db.collection("servers").updateOne(
                { guildId: this.guildId },
                {
                    $set: {
                        prefix: this.prefix,
                        modules: this.modules
                    }
                },
                {
                    upsert: true
                }
            ).then(
                () => resolve(),
                err => reject(err)
            )
        })   
    }

    public static async get(db: Db, guildId: string): Promise<Server> {
        let server = new Server(guildId);
        let serverObj = await db.collection("servers").findOne({ guildId: guildId });

        if (serverObj != null) {
            server.loadInto(serverObj);
            return server;
        }
        

        return new Promise((resolve, reject) => {
            server.update(db).then(
                () => resolve(server),
                err => reject(err)
            )
        });
    }
}