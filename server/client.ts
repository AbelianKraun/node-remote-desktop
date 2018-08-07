import Message, { MessageType } from "./message";
import { clientsRepository } from "./client_repository";
import { randomString, padLeft } from "./utils";

export enum ClientStatus {
    Creating,
    Ready,
    Connecting,
    Connected,
}



export class Client {

    public clientId: string | null = null;
    private clientPwd: string | null = null;
    private status = ClientStatus.Creating;
    private connectedClient: Client | null = null;

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
                this.handleUTFMessage(JSON.parse(message.utf8Data));
            } else if (message.type === "binary") {
                this.handleBinaryMessage(message.binaryData);
            }
        });

        connection.on('close', (reasonCode, description) => this.handleDisconnection(reasonCode, description));

        process.nextTick(() => {
            this.status = ClientStatus.Ready;

            if (this.onConnected)
                this.onConnected(this);

            let id = padLeft(Math.round(Math.random() * 100).toString(), 3, '0') + "" + padLeft(Math.round(Math.random() * 100).toString(), 3, '0') + "" + padLeft(Math.round(Math.random() * 100).toString(), 3, '0');
            let pwd = randomString(5, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").toUpperCase();

            this.clientId = id;
            this.clientPwd = pwd;

            // Send client ready
            this.sendMessage(MessageType.ClientReady, { id, pwd });
        });
    }

    private handleDisconnection(reasonCode: number, description: string) {
        this.log("Client disconnected. (" + this.connection.remoteAddress + ")");

        // Close all current connections
        this.closeConnection();

        if (this.onDisconnected)
            this.onDisconnected(this);
    }

    private handleUTFMessage(message: Message) {
        this.log(JSON.stringify(message));
        let target: Client | null = null;

        switch (message.type) {
            case MessageType.ConnectionRequest:
                if (this.status == ClientStatus.Ready) {

                    // Check target
                    let target = clientsRepository.findByClientId(message.content.id);
                    if (target && target != this && target.requestConnection(this, message.content.pwd))
                        this.status = ClientStatus.Connecting;
                    else {
                        this.sendMessage(MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }

                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
                break;
            case MessageType.ConnectionAccept:
                if (this.status == ClientStatus.Connecting) {
                    // Check target
                    let target = clientsRepository.findByUuid(message.content as string);

                    if (target)
                        target.acceptConnection(this)
                    else {
                        this.sendMessage(MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }
                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
                break;
            case MessageType.ConnectionCompleted:
                if (this.status == ClientStatus.Connecting) {

                    // Check target
                    let target = clientsRepository.findByUuid(message.content);
                    if (target && target.completeConnection(this)) {
                        this.completeConnection(target);

                        this.log("Connection estabilished. From " + this.clientId + " to " + target.clientId);
                    } else {
                        this.sendMessage(MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }
                } else {
                    this.sendMessage(MessageType.Error, "Client busy or not ready.");
                }
                break;
            case MessageType.ConnectionClose:
                if (!this.closeConnection()) {
                    this.sendMessage(MessageType.Error, "Client not connected to any destination or not ready");
                }
                break;
            case MessageType.FrameRequest:
                target = clientsRepository.findByUuid(message.content);
                if (target) {
                    target.requestFrame(this);
                } else {
                    this.sendMessage(MessageType.Error, "Target busy or not available");
                    this.closeConnection();
                }
                break;
            case MessageType.NextFrameData:
                target = clientsRepository.findByUuid(message.content);
                if (target) {
                    target.setNextFrameData(this, { x: message.content.x, y: message.content.y, w: message.content.y, h: message.content.h });
                } else {
                    this.sendMessage(MessageType.Error, "Target busy or not available");
                    this.closeConnection();
                }
                break;
        }
    }

    private handleBinaryMessage(message: Buffer) {

    }

    public sendMessage(type: MessageType, content?: any) {
        let message = new Message(type, content);

        if (this.connection && this.connection.connected)
            this.connection.sendUTF(message.toString());
    }

    public requestConnection(from: Client, pwd: string) {
        this.log("Connection request from " + from.clientId + ", pwd: " + pwd);
        if (pwd == this.clientPwd && this.status == ClientStatus.Ready) {
            this.status = ClientStatus.Connecting;
            this.sendMessage(MessageType.ConnectionRequest, from.uuid);
            return true;
        } else {
            return false;
        }
    }

    public acceptConnection(from: Client) {
        if (this.status == ClientStatus.Connecting) {
            this.sendMessage(MessageType.ConnectionAccept, from.uuid);
            return true;
        } else {
            return false;
        }
    }

    public completeConnection(other: Client) {
        if (this.status == ClientStatus.Connecting) {
            this.status = ClientStatus.Connected;
            this.connectedClient = other;
            this.sendMessage(MessageType.ConnectionCompleted, other.uuid);


            return true;
        } else {
            return false;
        }
    }

    public closeConnection() {
        if (this.status == ClientStatus.Connecting || this.status == ClientStatus.Connected) {
            let target = this.connectedClient;

            // Reset me
            this.status = ClientStatus.Ready;
            this.connectedClient = null;

            this.sendMessage(MessageType.ConnectionClosed);

            // Close other client
            if (target)
                target.closeConnection();

            return true;
        } else {
            return false;
        }
    }

    public requestFrame(from: Client) {
        if (this.status == ClientStatus.Connected) {
            this.sendMessage(MessageType.FrameRequest, from.uuid);
        }
    }

    public setNextFrameData(from: Client, data: any) {
        if (this.status == ClientStatus.Connected) {
            this.sendMessage(MessageType.NextFrameData, { from: from.uuid, x: data.x, y: data.y, w: data.w, h: data.h });
        }
    }

    private log(message: any) {
        console.log((this.clientId || this.uuid) + ": " + message);
    }

}