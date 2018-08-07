import Message, { MessageType } from "./message";
import { client as WebSocketClient } from "websocket"
import { setInterval } from "timers";
import captureModule from "./bindings"

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
    private host: boolean = false;
    private frameReceived: boolean = false;
    private screenCapturer: any = null;
    private cache: any[] = [];
    private nextFrameData: any = null;

    // Events
    public onConnected: (client: Client) => void;
    public onDisconnected: (client: Client) => void;
    public onReady: (id: string, pwd: string) => void;
    public onFrameReceived: (content: Buffer, frameData: any) => void;


    constructor() {

        this.log("Client created.");
        this.sendFrame = this.sendFrame.bind(this);

        // Setup events


        this.websocketClient.on("connect", (connection) => {
            this.log("Connected.")
            this.connection = connection;
            this.screenCapturer = new captureModule.Vector();


            // Init device
            if (!this.screenCapturer.initDevice()) {
                console.log("Init device failed.");
            }


            this.connection.on('close', (reasonCode, description) => this.handleDisconnection(reasonCode, description));
            this.connection.on('message', (message) => {
                if (message.type === 'utf8') {
                    this.handleUTFMessage(JSON.parse(message.utf8Data));
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

    public connectTo(id: string, pwd: string) {
        this.host = true;
        this.sendMessage(MessageType.ConnectionRequest, { id, pwd });
    }

    private handleDisconnection(reasonCode: number, description: string) {
        this.log("Client disconnected. (" + reasonCode + ", " + description + ")");

        this.cleanConnection();
        this.status = ClientStatus.Disconnected;

        if (this.screenCapturer)
            this.screenCapturer.releaseDevice();

        if (this.onDisconnected)
            this.onDisconnected(this);

        setTimeout(() => this.connect(), 10000);
    }

    private handleUTFMessage(message: Message) {
        this.log(message);

        switch (message.type) {
            case MessageType.Error:
                this.connectedClient = null;

            case MessageType.ClientReady:
                this.status = ClientStatus.Ready;
                this.clientId = message.content.id;
                this.clientPwd = message.content.pwd;

                if (this.onReady)
                    this.onReady(this.clientId, this.clientPwd);
                break;
            case MessageType.ConnectionRequest:
                this.host = false;
                // Request is already authorized by server, so we don't need to check for pwd
                this.connectedClient = message.content;
                this.sendMessage(MessageType.ConnectionAccept, message.content); // Content contains the guid of the requester
                break;
            case MessageType.ConnectionAccept:
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(MessageType.ConnectionCompleted, message.content); // Content contains the guid of the requester
                break;
            case MessageType.ConnectionCompleted:
                this.status = ClientStatus.Connected;
                this.connectedClient = message.content;
                this.log("Connection estabilished with " + message.content);

                if (this.host)
                    this.requestNextFrame();
                else
                    this.sendFrame();

                break;
            case MessageType.ConnectionClosed:
                this.cleanConnection();
                break;
            case MessageType.FrameRequest:
                this.frameReceived = true;
                break;
            case MessageType.NextFrameData:
                this.nextFrameData = message.content;
                break;
        }
    }

    private cleanConnection() {
        this.status = ClientStatus.Ready;
        this.connectedClient = null;
        this.host = false;

        this.log("Connection cleaned.");
    }

    private requestNextFrame() {

        if (this.status != ClientStatus.Connected) {
            console.log("Requesting next frame but not connected. Clearing interval.");
            return;
        }

        this.sendMessage(MessageType.FrameRequest, this.connectedClient);
    }

    private sendFrame() {
        if (this.frameReceived) {
            let dirties = this.cache.filter(c => c.isDirty).sort(x => x.updated.getTime());
            let d = dirties.length > 0 ? dirties[0] : null;

            if (d) {
                d.isDirty = false;
                console.log("Sending frame: ", d.x, d.y, d.width, d.height, d.data.length);
                this.sendMessage(MessageType.NextFrameData, { to: this.connectedClient, x: d.x, y: d.y, w: d.width, h: d.height });
                this.connection.sendBytes(Buffer.from(d.data));
                this.frameReceived = false;
            }
        }

        let d = this.screenCapturer.getNextFrame((d) => {
            if (d.data.length != 0) {

                let previous = this.cache.find(c => c.x == d.x && c.y == d.y);
                if (!previous) {
                    previous = { x: d.x, y: d.y, width: d.width, height: d.height };
                    this.cache.push(previous);
                }

                if (previous.data) {
                    delete previous.data;
                }

                if (previous.updated)
                    delete previous.updated;

                previous.data = d.data;
                previous.updated = new Date();
                previous.isDirty = true;
            }

            setTimeout(this.sendFrame, 0);
        });
    }

    private handleBinaryMessage(message: Buffer) {
        if (this.nextFrameData) {

            if (this.onFrameReceived)
                this.onFrameReceived(message, this.nextFrameData);

            this.requestNextFrame();
        }
    }

    public sendMessage(type: MessageType, content?: any) {
        let message = new Message(type, content);

        if (this.connection && this.connection.connected)
            this.connection.sendUTF(message.toString());
    }

    private log(message: any) {
        console.log(message);
    }

}