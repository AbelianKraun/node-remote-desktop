import { Client } from "./client";
import { MessageType } from "./models";


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

