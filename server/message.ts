import { Client } from "./client";

export enum MessageType {
    ClientReady,

    ConnectionRequest,
    ConnectionAccept,
    ConnectionCompleted,
    ConnectionClose,
    ConnectionClosed,

    MouseMove,
    MouseClick,
    MouseWheel,

    NextFrameData,
    FrameReceived,

    Success,
    Error
}

export default class Message {
    public destination: string | null;

    constructor(public type: MessageType, destination: Client | string | null, public content: any) {

        if (destination)
            this.destination = destination instanceof Client ? destination.uuid : this.destination;
    }

    public toString() {

        let msg: any = {
            type: this.type,
            content: this.content
        };

        if (this.destination)
            msg.destination = this.destination;

        return JSON.stringify(msg);
    }
}

