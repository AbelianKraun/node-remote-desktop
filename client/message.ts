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
    FrameRequest,

    Success,
    Error,
}

export default class Message {
    public destination: string | null;

    constructor(public type: MessageType,  public content: any) {

    }

    public toString() {

        let msg: any = {
            type: this.type,
            content: this.content
        };

        return JSON.stringify(msg);
    }
}

