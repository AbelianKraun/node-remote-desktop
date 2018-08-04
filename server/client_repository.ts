import { Client } from "./client";


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

export var clientsRepository = new ClientRepository();