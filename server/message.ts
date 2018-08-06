import { Client } from "./client";

export enum MessageType {
    ClientReady,

    ConnectionRequest,
    ConnectionAccept,
    ConnectionCompleted,
    ConnectionClose,
    ConnectionClosed,

    MouseEvent,

    NextFrameData,
    FrameReceived,

    Success,
    Error,
}

export default class Message {

    constructor(public type: MessageType, public content: any) {
        
    }

    public toString() {

        let msg: any = {
            type: this.type,
            content: this.content
        };

        return JSON.stringify(msg);
    }
}

