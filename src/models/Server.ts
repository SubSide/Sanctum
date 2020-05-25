import { Db } from "mongodb";

export class Server {
    constructor(
        public guildId: string,
        public prefix: string = '!',
        public voiceCategoryId: string = null
    ) {}


    loadInto(obj: any) {
        this.prefix = obj.prefix;
        this.voiceCategoryId = obj.voiceCategoryId;
    }

    public async update(db: Db): Promise<void> {
        return new Promise((resolve, reject) => {
            db.collection("servers").updateOne(
                { guildId: this.guildId },
                {
                    $set: {
                        prefix: this.prefix,
                        voiceCategoryId: this.voiceCategoryId
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