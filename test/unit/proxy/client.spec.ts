import * as chai from 'chai';
import chaiDatetime from 'chai-datetime';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { assert, expect } from 'chai';
import { Socket } from 'net';
import * as FLLScoreClientConstants from '../../../src/constants/index';
import { Client } from '../../../src/proxy/client';
import * as FLLScoreClient from '../../../src/shared/interface';

chai.use(chaiDatetime);
chai.use(sinonChai);

let clock = (this as any).clock;

export class ClientSpec {
    public static run() {
        describe('Client', () => {
            describe('constructor', () => {
                it('should construct with no parameters', () => {
                    const client = new Client();

                    expect(client.opts.host).to.equal('localhost');
                    expect(client.opts.port).to.equal(25002);
                    expect(client.opts.name).to.equal('FLLScoreClient');
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    assert.isUndefined(client.lastUpdate);
                    assert.isUndefined(client.scoreInfo);
                    assert.isTrue(client.socket instanceof Socket);
                });

                it('should construct with host', () => {
                    const client = new Client({host: 'new-host'});

                    expect(client.opts.host).to.equal('new-host');
                    expect(client.opts.port).to.equal(25002);
                    expect(client.opts.name).to.equal('FLLScoreClient');
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    assert.isUndefined(client.lastUpdate);
                    assert.isUndefined(client.scoreInfo);
                    assert.isTrue(client.socket instanceof Socket);
                });

                it('should construct with host and port', () => {
                    const client = new Client({host: 'new-host', port: 8080});

                    expect(client.opts.host).to.equal('new-host');
                    expect(client.opts.port).to.equal(8080);
                    expect(client.opts.name).to.equal('FLLScoreClient');
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    assert.isUndefined(client.lastUpdate);
                    assert.isUndefined(client.scoreInfo);
                    assert.isTrue(client.socket instanceof Socket);
                });

                it('should construct with host, port and name', () => {
                    const client = new Client({host: 'new-host', port: 8080, name: 'new-name'});

                    expect(client.opts.host).to.equal('new-host');
                    expect(client.opts.port).to.equal(8080);
                    expect(client.opts.name).to.equal('new-name');
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    assert.isUndefined(client.lastUpdate);
                    assert.isUndefined(client.scoreInfo);
                    assert.isTrue(client.socket instanceof Socket);
                });
            });

            describe('connect', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;

                beforeEach(() => {
                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest', useWatchdog: false});
                });

                it('should resolve on successful connect', () => {

                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        setTimeout(() => {
                            cb();
                        }, 1);
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake(() => {
                        client.socket.emit('data', 'Welcome:5\r\n');
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    const promise = client.connect().then((res) => {
                        expect(res).to.equal('Connected');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(1);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        connectStub.restore();
                        writeStub.restore();
                    });
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connecting);
                    return promise;
                });

                it('should reject when an connect error occurs', () => {
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        setTimeout(() => {
                            client.socket.emit('error', new Error('connect error'));
                            client.socket.emit('close', false);
                        }, 1);
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake(() => {
                        client.socket.emit('data', 'Welcome:5\r\n');
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    const promise = client.connect().catch((err) => {
                        expect(err.message).to.equal('connect error');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).not.to.have.callCount(1);
                        connectStub.restore();
                        writeStub.restore();
                    });
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connecting);
                    return promise;
                });

                it('should reject when a wrong welcome message is returned', () => {
                    clock = sinon.useFakeTimers();
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        setTimeout(() => {
                            cb();
                        }, 1);
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake(() => {
                        client.socket.emit('data', 'NotWelcome:5\r\n');
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    const promise = client.connect().catch((err) => {
                        expect(err.message).to.equal('timeout');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(1);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        connectStub.restore();
                        writeStub.restore();
                    });
                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connecting);
                    clock.tick(5000);
                    clock.restore();
                    return promise;
                }).timeout(6000);
            });

            describe('sendPing', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;

                beforeEach(() => {
                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest', useWatchdog: false});
                });

                it('should resolve on successful ping', () => {
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Ping:\r\n') {
                            client.socket.emit('data', 'Echo:\r\n');
                        }
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        return client.sendPing();
                    }).then((res) => {
                        expect(res).to.equal('Echo Received');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Ping:\r\n');
                        connectStub.restore();
                        writeStub.restore();
                    });
                });

                it('should reject if client is not connected', () => {
                    return client.sendPing().catch((err) => {
                        expect(err.message).to.equal('Not Connected');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    });
                });

                it('should reject when a send error occurs', () => {
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Ping:\r\n') {
                            client.socket.emit('error', new Error('send error'));
                            client.socket.emit('close', false);
                        }
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        return client.sendPing();
                    }).catch((err) => {
                        expect(err.message).to.equal('send error');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Ping:\r\n');
                        connectStub.restore();
                        writeStub.restore();
                    });
                });

                it('should reject when a wrong echo message is returned', () => {
                    clock = sinon.useFakeTimers();
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer: string) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Ping:\r\n') {
                            client.socket.emit('data', 'NotEcho:\r\n');
                        }
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        const promise = client.sendPing();
                        clock.tick(5000);
                        clock.restore();
                        return promise;
                    }).catch((err) => {
                        expect(err.message).to.equal('timeout');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Ping:\r\n');
                        connectStub.restore();
                        writeStub.restore();
                    });
                }).timeout(6000);
            });

            describe('sendLastUpdate', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;

                beforeEach(() => {
                    clock = sinon.useFakeTimers();
                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest', useWatchdog: false});
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });
                });

                afterEach(() => {
                    connectStub.restore();
                    clock.restore();
                });

                it('should resolve on a successful last update', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Send Last Update:\r\n') {
                            client.socket.emit('data', 'Last Update:11/10/2017 7:52:40 AM\r\n');
                        }
                    });

                    return client.connect().then(() => {
                        return client.sendLastUpdate();
                    }).then((res) => {
                        const date = new Date('11/10/2017 7:52:40 AM');
                        assert.isTrue(res);
                        expect(client.lastUpdate).to.equalDate(date);
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Last Update:\r\n');
                        writeStub.restore();
                    });
                });

                it('should reject if client is not connected', () => {
                    return client.sendLastUpdate().catch((err) => {
                        expect(err.message).to.equal('Not Connected');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    });
                });

                it('should reject when a send error occurs', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer: string) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Send Last Update:\r\n') {
                            client.socket.emit('error', new Error('send error'));
                            client.socket.emit('close', false);
                        }
                    });

                    return client.connect().then(() => {
                        return client.sendLastUpdate();
                    }).catch((err) => {
                        expect(err.message).to.equal('send error');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Last Update:\r\n');
                        writeStub.restore();
                    });
                });

                it('should reject when a wrong last update message is sent', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer: string, cb) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                            cb();
                        } else if (buffer === 'Send Last Update:\r\n') {
                            client.socket.emit('data', 'NotLastUpdate:\r\n');
                        }
                    });

                    return client.connect().then(() => {
                        const promise = client.sendLastUpdate();
                        clock.tick(5000);
                        clock.restore();
                        return promise;
                    }).catch((err) => {
                        expect(err.message).to.equal('timeout');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Last Update:\r\n');
                        writeStub.restore();
                    });
                }).timeout(6000);
            });

            describe('sendScore', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;

                beforeEach(() => {
                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest', useWatchdog: false});
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });
                });

                afterEach(() => {
                    connectStub.restore();
                });

                it('should resolve on a successful send score', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Send Score:\r\n') {
                            const responses = [
                                'Score Header:11/10/2017 7:52:40 AM|12|36|6\r\n',
                                'Score:16449|Dolphin Spiders|310|310|-1|-1\r\n',
                                'Score:17557|Crimson Flying|145|145|-1|-1\r\n',
                                'Score:23402|Striking Heroes|270|270|-1|-1\r\n',
                                'Score:30150|Lightning Spanners|275|275|-1|245\r\n',
                                'Score:33256|Alpha Secret Agents|-1|-1|-1|-1\r\n',
                                'Score:36131|Ice Mutants|205|205|-1|-1\r\n',
                                'Score:41714|Muffin Bandits|-1|-1|-1|-1\r\n',
                                'Score:45406|Venomous Slammers|-1|-1|-1|-1\r\n',
                                'Score:48551|Sneaky Falcons|-1|-1|-1|-1\r\n',
                                'Score:61655|Extreme Dragons|-1|-1|-1|-1\r\n',
                                'Score:74638|Butterfly Racoons|-1|-1|-1|-1\r\n',
                                'Score:90436|Fire Bandits|-1|-1|-1|-1\r\n',
                                'Score Done:\r\n',
                            ];
                            client.socket.emit('data', responses.join(''));
                        }
                    });

                    return client.connect().then(() => {
                        return client.sendScore();
                    }).then((res: FLLScoreClient.IScoreInfo) => {
                        assert.isDefined(res.scheduleInfo);
                        assert.isDefined(res.teamInfo);
                        expect(res.teamInfo.length).to.equal(12);
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Score:\r\n');
                        writeStub.restore();
                    });
                });

                it('should resolve when data is sent in parts', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Send Score:\r\n') {
                            const responses1 = [
                                'Score Header:11/10/2017 7:52:40 AM|12|36|6\r\n',
                                'Score:16449|Dolphin Spiders|310|310|-1|-1\r\n',
                                'Score:17557|Crimson Flying|145|145|-1|-1\r\n',
                                'Score:23402|Striking Heroes|270|270|-1|-1\r\n',
                                'Score:30150|Lightning Spanners|275|275|-1|245\r\n',
                                'Score:33256|Alpha Secret Agents|-1|-1|-1|-1\r\n',
                                'Score:36131|Ice Mutants|',
                            ];
                            const responses2 = [
                                '205|205|-1|-1\r\n',
                                'Score:41714|Muffin Bandits|-1|-1|-1|-1\r\n',
                                'Score:45406|Venomous Slammers|-1|-1|-1|-1\r\n',
                                'Score:48551|Sneaky Falcons|-1|-1|-1|-1\r\n',
                                'Score:61655|Extreme Dragons|-1|-1|-1|-1\r\n',
                                'Score:74638|Butterfly Racoons|-1|-1|-1|-1\r\n',
                                'Score:90436|Fire Bandits|-1|-1|-1|-1\r\n',
                                'Score Done:\r\n',
                            ];
                            client.socket.emit('data', responses1.join(''));
                            client.socket.emit('data', responses2.join(''));
                        }
                    });

                    return client.connect().then(() => {
                        return client.sendScore();
                    }).then((res: FLLScoreClient.IScoreInfo) => {
                        assert.isDefined(res.scheduleInfo);
                        assert.isDefined(res.teamInfo);
                        expect(res.teamInfo.length).to.equal(12);
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Score:\r\n');
                        writeStub.restore();
                    });
                });

                it('should reject if client is not connected', () => {
                    return client.sendScore().catch((err) => {
                        expect(err.message).to.equal('Not Connected');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    });
                });

                it('should reject when a send error occurs', () => {
                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        } else if (buffer === 'Send Score:\r\n') {
                            client.socket.emit('error', new Error('send error'));
                            client.socket.emit('close', false);
                        }
                    });

                    return client.connect().then(() => {
                        return client.sendScore();
                    }).catch((err) => {
                        expect(err.message).to.equal('send error');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(2);
                        expect(writeStub).to.have.been.calledWith('FLLScore:UnitTest|Primary\r\n');
                        expect(writeStub).to.have.been.calledWith('Send Score:\r\n');
                        writeStub.restore();
                    });
                });
            });

            describe('close', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let endStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;

                beforeEach(() => {
                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest', useWatchdog: false});
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.callsFake((buffer) => {
                        if (buffer === 'FLLScore:UnitTest|Primary\r\n') {
                            client.socket.emit('data', 'Welcome:5\r\n');
                        }
                    });
                });

                afterEach(() => {
                    connectStub.restore();
                    writeStub.restore();
                });

                it('should resolve on successful close', () => {
                    endStub = sinon.stub(client.socket, 'end');
                    endStub.callsFake(() => {
                        client.socket.emit('close', false);
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        return client.close();
                    }).then((res) => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(res).to.equal('Connection Closed');
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(1);
                        expect(endStub).to.have.callCount(1);
                        endStub.restore();
                    });
                });

                it('should reject if client is not connected', () => {
                    return client.close().catch((err) => {
                        expect(err.message).to.equal('Not Connected');
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    });
                });

                it('should reject on a close error', () => {
                    endStub = sinon.stub(client.socket, 'end');
                    endStub.callsFake(() => {
                        client.socket.emit('close', true);
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        return client.close();
                    }).catch((res) => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(res.message).to.equal('Closed with error');
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(1);
                        expect(endStub).to.have.callCount(1);
                        endStub.restore();
                    });
                });

                it('should reject on an end error', () => {
                    endStub = sinon.stub(client.socket, 'end');
                    endStub.callsFake(() => {
                        client.socket.emit('error', new Error('close error'));
                        client.socket.emit('close', false);
                    });

                    expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                    return client.connect().then(() => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Connected);
                        return client.close();
                    }).catch((res) => {
                        expect(client.status).to.equal(FLLScoreClientConstants.ConnectionStatus.Disconnected);
                        expect(res.message).to.equal('close error');
                        expect(connectStub).to.have.callCount(1);
                        expect(writeStub).to.have.callCount(1);
                        expect(endStub).to.have.callCount(1);
                        endStub.restore();
                    });
                });
            });

            describe('watchdog timer', () => {
                let client: Client;
                let connectStub: sinon.SinonStub;
                let endStub: sinon.SinonStub;
                let writeStub: sinon.SinonStub;
                let setIntervalSpy: sinon.SinonSpy;
                let clearIntervalSpy: sinon.SinonSpy;

                beforeEach(() => {
                    clock = sinon.useFakeTimers();

                    setIntervalSpy = sinon.spy(clock, 'setInterval');
                    clearIntervalSpy = sinon.spy(clock, 'clearInterval');

                    client = new Client({host: 'localhost', port: 25002, name: 'UnitTest'});
                    connectStub = sinon.stub(client.socket, 'connect');
                    connectStub.callsFake((options, cb) => {
                        expect(options.port).to.equal(25002);
                        expect(options.host).to.equal('localhost');
                        cb();
                    });

                    writeStub = sinon.stub(client.socket, 'write');
                    writeStub.withArgs('FLLScore:UnitTest|Primary\r\n').callsFake(() => {
                        client.socket.emit('data', 'Welcome:5\r\n');
                    });
                    writeStub.callsFake((buffer, cb) => {
                        if (buffer === 'Ping:\r\n') {
                            client.socket.emit('data', 'Echo:\r\n');
                            if (cb !== undefined) {
                                cb();
                            }
                        }
                    });

                    endStub = sinon.stub(client.socket, 'end');
                    endStub.callsFake(() => {
                        client.socket.emit('close', false);
                    });
                });

                afterEach(() => {
                    connectStub.restore();
                    writeStub.restore();
                    endStub.restore();
                    setIntervalSpy.restore();
                    clearIntervalSpy.restore();
                    clock.restore();
                });

                it('should cancel timer when closing connection', () => {
                    return client.connect().then(() => {
                        expect(setIntervalSpy).to.have.callCount(1);
                        return client.close();
                    }).then(() => {
                        expect(clearIntervalSpy).to.have.callCount(1);
                    });
                });

                it('should call ping when no calls have been made', () => {
                    return client.connect().then(() => {
                        expect(setIntervalSpy).to.have.callCount(1);
                        clock.tick(5100);
                        expect(writeStub).to.have.callCount(2);
                        clock.tick(5100);
                        expect(writeStub).to.have.callCount(3);
                        return client.close();
                    });
                });

                it('should reset timer when a call has been made', () => {
                    return client.connect().then(() => {
                        expect(setIntervalSpy).to.have.callCount(1);
                        clock.tick(5100);
                        expect(writeStub).to.have.callCount(2);
                        clock.tick(3000);
                        expect(clearIntervalSpy).to.have.callCount(0);
                        expect(setIntervalSpy).to.have.callCount(1);
                        return client.sendPing();
                    }).then(() => {
                        clock.tick(2000);
                        expect(clearIntervalSpy).to.have.callCount(1);
                        expect(setIntervalSpy).to.have.callCount(2);
                        expect(writeStub).to.have.callCount(3);
                        return client.close();
                    });
                });
            });
        });

    }
}
