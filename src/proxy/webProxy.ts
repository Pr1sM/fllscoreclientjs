import * as io from 'socket.io';
import {FLLScoreClient} from '../shared/interface';
import {createClient} from './index';

export class WebProxy {
    public readonly host: string = 'localhost';
    public readonly infoPollingRate: number = 30;
    public readonly port: number = 25002;
    public readonly servePort: number = 25003;
    public readonly name: string = 'FLLScoreClient';

    private server: SocketIO.Server;
    private fllclient: FLLScoreClient.IClient;
    private useWatchdog: boolean = true;
    private pollTest?: NodeJS.Timer;

    constructor(opts?: FLLScoreClient.IWebProxyOpts) {
        if (opts !== undefined) {
            this.host = opts.host || this.host;
            this.infoPollingRate = opts.infoPollingRate || this.infoPollingRate;
            this.port = opts.port || this.port;
            this.servePort = opts.servePort || this.servePort;
            this.name = opts.name || this.name;
            this.useWatchdog = opts.useWatchdog || this.useWatchdog;
        }

        if (this.port === this.servePort) {
            this.servePort = this.port + 1;
        }

        this.fllclient = createClient({
            host: this.host,
            name: this.name,
            port: this.port,
            useWatchdog: this.useWatchdog,
        });

        this.server = io();
        this.server.on('connection', (client: SocketIO.Socket) => {
            if (this.fllclient.lastUpdate !== undefined) {
                client.emit('lastUpdate', this.fllclient.lastUpdate.toISOString());
            }

            if (this.fllclient.scoreInfo !== undefined) {
                client.emit('scoreInfo', this.fllclient.scoreInfo);
            }

            client.on('sendLastUpdate', (m, cb) => {
                if (m === 'please') {
                    if (this.fllclient.lastUpdate !== undefined) {
                        cb(this.fllclient.lastUpdate.toISOString());
                    } else {
                        this.fllclient.sendLastUpdate().then(() => {
                            client.emit('lastUpdate', this.fllclient.lastUpdate!.toISOString());
                            cb(this.fllclient.lastUpdate!.toISOString());
                        }).catch((err: Error) => {
                            // TODO: Deal with this error
                            console.log(err);
                        });
                    }
                } else {
                    cb(new Error('invalid command'));
                }
            });

            client.on('sendScoreInfo', (m, cb?) => {
                if (m === 'please') {
                    if (this.fllclient.scoreInfo !== undefined) {
                        cb(this.fllclient.scoreInfo);
                    } else {
                        this.fllclient.sendScore().then((scoreInfo: FLLScoreClient.IScoreInfo) => {
                            client.emit('scoreInfo', scoreInfo);
                            cb(scoreInfo);
                        }).catch((err: Error) => {
                            // TODO: Deal with this error
                            console.log(err);
                        });
                    }
                } else {
                    cb(new Error('invalid command'));
                }
            });
        });
    }

    public startProxy(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.fllclient.connect().then(() => {
                this.fllclient.socket.on('data', (data) => {
                    console.log('Received:\n\t' + data.toString().trim());
                });

                this.pollTest = setInterval(() => {
                    this.fllclient.sendLastUpdate().then((updated: boolean) => {
                        if (updated) {
                            return this.fllclient.sendScore();
                        } else {
                            return Promise.resolve(undefined);
                        }
                    }).then((info?: FLLScoreClient.IScoreInfo) => {
                        if (info !== undefined) {
                            this.server.emit('lastUpdate', this.fllclient.lastUpdate);
                            this.server.emit('scoreInfo', info);
                        }
                    }).catch((err: Error) => {
                        // TODO: Deal with error
                        console.log(err);
                    });
                }, this.infoPollingRate * 1000);
                this.server.listen(this.servePort);
                resolve(true);
            }).catch(() => {
                resolve(false);
            });
        });
    }
}
