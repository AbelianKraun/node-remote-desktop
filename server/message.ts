import { Client } from "./client";

export enum MessageType {
    ConnectionRequest,
    ConnectionAccept,
    ConnectionAccepted,

    MouseMove,
    MouseClick,
    MouseWheel,

    NextFrameData,
    FrameReceived
}

export default class Message {
    constructor(public type: MessageType, public destination: Client | string, public content: any) {
    }

    public toString() {
        return JSON.stringify({
            type: this.type,
            destination: this.destination instanceof Client ? this.destination.uuid : this.destination,
            content: this.content
        })
    }
}

