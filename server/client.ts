import Message, { MessageType } from "./message";

export enum ClientStatus {
    Creating,
    Ready,
    Connecting,
    Connected,
}

export class Client {

    private status = ClientStatus.Creating;
    private connectedClient: Client | null = null;

    // Events
    public onConnected: (client: Client) => void;
    public onDisconnected: (client: Client) => void;
    public onQueueMessage: (from: Client, to: Client | string, type: MessageType, content: any) => void;


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

        process.nextTick(() => {
            this.status = ClientStatus.Ready;

            if (this.onConnected)
                this.onConnected(this);

            // Send client ready
            this.sendMessage(MessageType.ClientReady);
        });
    }

    private handleDisconnection(reasonCode: number, description: string) {
        this.log("Client disconnected. (" + this.connection.remoteAddress + ")");

        if (this.onDisconnected)
            this.onDisconnected(this);
    }

    private handleUTFMessage(message: Message) {
        this.log(message);

        switch (message.type) {
            case MessageType.ConnectionRequest:
                if (this.status == ClientStatus.Ready) {
                    this.status = ClientStatus.Connecting;
                    this.relayMessage(message);
                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
            case MessageType.ConnectionAccept:
                if (this.status == ClientStatus.Ready) {
                    this.status = ClientStatus.Connecting;
                    this.relayMessage(message);
                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
            case MessageType.ConnectionCompleted:
                if (this.status == ClientStatus.Connecting) {
                    this.status = ClientStatus.Connected;
                    this.relayMessage(message);
                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
            case MessageType.ConnectionClose:
                if (this.status == ClientStatus.Connecting || this.status == ClientStatus.Connected) {

                    // Reset me
                    this.status = ClientStatus.Ready;
                    this.connectedClient = null;

                    this.sendMessageToOther(message.destination, MessageType.ConnectionClosed);
                } else {
                    this.sendMessage(MessageType.Error, "Client not connected to any destination or not ready");
                }
        }
    }

    private handleBinaryMessage(message: Buffer) {

    }

    // This method simply work as a relay. We just send a message from client to client
    private relayMessage(message: Message) {
        this.sendMessageToOther(message.destination, message.type, message.content);
    }

    private sendMessageToOther(destination: Client | string, type: MessageType, content?: any) {
        if (this.onQueueMessage)
            this.onQueueMessage(this, destination, type, content);
    }

    public sendMessage(type: MessageType, content?: any) {
        let message = new Message(type, null, content);

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
