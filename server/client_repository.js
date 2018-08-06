"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ClientRepository = /** @class */ (function () {
    function ClientRepository() {
        this.clients = [];
    }
    Object.defineProperty(ClientRepository.prototype, "length", {
        get: function () {
            return this.clients.length;
        },
        enumerable: true,
        configurable: true
    });
    ClientRepository.prototype.add = function (client) {
        this.clients.push(client);
    };
    ClientRepository.prototype.remove = function (clientToRemove) {
        var newClients = [];
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            if (client != clientToRemove)
                newClients.push(client);
        }
        this.clients = newClients;
    };
    ClientRepository.prototype.findByUuid = function (uuid) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            if (client.uuid == uuid)
                return client;
        }
        return null;
    };
    ClientRepository.prototype.findByClientId = function (id) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            if (client.clientId == id)
                return client;
        }
        return null;
    };
    return ClientRepository;
}());
exports.ClientRepository = ClientRepository;
exports.clientsRepository = new ClientRepository();
//# sourceMappingURL=client_repository.js.map