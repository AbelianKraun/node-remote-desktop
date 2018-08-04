import Message, { MessageType } from "./message";

export class Client {

    // Events
    public onConnected: (client: Client) => void;
    public onDisconnected: (client: Client) => void;

    constructor(public uuid: string, private connection: any) {
        this.connection = connection;
        this.uuid = uuid;

        this.log("New client created. (" + this.connection.remoteAddress + ")")

        // Setup events
        connection.on('message', (message) => {
            if (message.type === 'utf8') {
                this.handleUTFMessage(message.utf8Data);
            } else if (message.type === "binary") {
                this.handleBinaryMessage(message.binaryData);
            }
        });

        connection.on('close', (reasonCode, description) => this.handleDisconnection(reasonCode, description));

        // Wait for callabacks tu init
        process.nextTick(() => {
            if (this.onConnected)
                this.onConnected(this);
        });
    }

    private handleDisconnection(reasonCode: number, description: string) {
        this.log("Client disconnected. (" + this.connection.remoteAddress + ")");

        if (this.onDisconnected)
            this.onDisconnected(this);
    }

    private handleUTFMessage(message: Message) {
        this.log(message);
    }

    private handleBinaryMessage(message: Buffer) {

    }

    private sendMessage(type: MessageType, destination: Client | string, content: any) {
        let message = new Message(type, destination, content);

        if (this.connection)
            this.connection.sendUTF(message.toString());
    }

    private log(message: any) {
        console.log(this.uuid + ": " + message);
    }

}

export class ClientRepository {
    private clients: Client[] = [];

    get length() {
        return this.clients.length;
    }

    public add(client: Client) {
        this.clients.push(client);
    }

    public remove(clientToRemove: Client) {
        let newClients: Client[] = [];

        for (let client of this.clients)
            if (client != clientToRemove)
                newClients.push(client);

        this.clients = newClients;
    }

    public findByUuid(uuid: string): Client | null {
        for (let client of this.clients)
            if (client.uuid == uuid)
                return client;

        return null;
    }
}
