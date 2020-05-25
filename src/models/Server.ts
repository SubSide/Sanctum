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

    public delete(db: Db) {
        db.collection('servers').deleteOne({ guildId: this.guildId });
        
        let index = Server.cache.indexOf(this);
        if (index != -1) {
            Server.cache.splice(index, 1);
        }
    }

    private static cache: any = [];

    public static async get(db: Db, guildId: string): Promise<Server> {
        // Check if we already have it in cache
        let cacheItem = Server.cache[guildId];
        if (cacheItem != null) {
            return new Promise(res => res(cacheItem))
        }
        // Otherwise we create a new server object
        let server = new Server(guildId);
        // Add it to our cache
        Server.cache[guildId] = server;
        // And try to get it from our database
        let serverObj = await db.collection("servers").findOne({ guildId: guildId });

        if (serverObj != null) {
            // If we have it in our database we load it in our server object
            server.loadInto(serverObj);

            // And return it
            return new Promise(res => res(server));
        }
        
        // Otherwise it's a new entry and we want to add it to our database
        return new Promise((resolve, reject) => {
            server.update(db).then(
                () => resolve(server),
                err => reject(err)
            )
        });
    }
}