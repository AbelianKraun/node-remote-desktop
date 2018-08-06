import Message, { MessageType } from "./message";
import { client as WebSocketClient } from "websocket"

export enum ClientStatus {
    Disconnected,
    Connected,
    Ready,
}

export class Client {

    private status = ClientStatus.Disconnected;
    private connectedClient: string | null = null;
    private websocketClient = new WebSocketClient();
    private connection: any = null;
    private uuid: string = "";
    private clientId: string = "";
    private clientPwd: string = "";

    // Events
    public onConnected: (client: Client) => void;
    public onDisconnected: (client: Client) => void;
    public onReady: (id: string, pwd: string) => void;


    constructor() {

        this.log("Client created.");

        // Setup events
      

        this.websocketClient.on("connect", (connection) => {
            this.log("Connected.")
            this.connection = connection;

            this.connection.on('close', (reasonCode, description) => this.handleDisconnection(reasonCode, description));
            this.connection.on('message', (message) => {
                if (message.type === 'utf8') {
                    this.handleUTFMessage(message.utf8Data);
                } else if (message.type === "binary") {
                    this.handleBinaryMessage(message.binaryData);
                }
            });
        });
        this.websocketClient.on('connectFailed', error => this.handleDisconnection(0, error.toString()));          
       


    }

    public connect() {
        this.log("Try connecting to server...");
        if (this.status == ClientStatus.Disconnected) {
            this.websocketClient.connect('ws://localhost:8085/', 'echo-protocol');
        }
    }

    public disconnect() {
        if (this.status != ClientStatus.Disconnected) {
            this.websocketClient.disconnect();
        }
    }

    private handleDisconnection(reasonCode: number, description: string) {
        this.log("Client disconnected. (" + reasonCode + ", " + description + ")");

        this.status = ClientStatus.Disconnected;
        this.connectedClient = null;

        if (this.onDisconnected)
            this.onDisconnected(this);

        setTimeout(() => this.connect(), 10000);
    }

    private handleUTFMessage(message: Message) {
        this.log(message);

        switch (message.type) {
            case MessageType.ClientReady:
                this.status = ClientStatus.Ready;
                this.clientId = message.content.id;
                this.clientPwd = message.content.pwd;

                if (this.onReady)
                    this.onReady(this.clientId, this.clientPwd);
                break;
                
        }
    }

    private handleBinaryMessage(message: Buffer) {

    }

    public sendMessage(type: MessageType, content?: any) {
        let message = new Message(type, null, content);

        if (this.connection && this.connection.connected)
            this.connection.sendUTF(message.toString());
    }
    

    private log(message: any) {
        console.log(message);
    }

}