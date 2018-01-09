/// <reference types="node" />
/// <reference types="socket.io-client" />
import { FLLScoreClient } from '../shared/interface';
import EventEmitter = NodeJS.EventEmitter;
export declare class WebClient extends EventEmitter implements FLLScoreClient.IWebClient {
    host: string;
    port: number;
    name: string;
    lastUpdate?: Date;
    scoreInfo?: FLLScoreClient.IScoreInfo;
    status: number;
    socket: SocketIOClient.Socket;
    private useWatchdog;
    private watchdogInterval;
    private connTest?;
    constructor(host?: string, port?: number, name?: string, useWatchdog?: boolean);
    connect(): Promise<string>;
    sendPing(): Promise<string>;
    sendLastUpdate(): Promise<Date>;
    sendScore(): Promise<FLLScoreClient.IScoreInfo>;
    close(): Promise<string>;
    private resetConnectionTest();
}