import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import {WebClient} from '../../src/client/webClient';
import {expect} from "chai";
import {FLLScoreClient} from '../../src/shared/interface';
import {emitKeypressEvents} from 'readline';

chai.use(sinonChai);

export class WebClientSpec {
    public static run() {
        describe('WebClient', () => {
            let webClient:WebClient;

            afterEach(() => {
                if (webClient !== undefined) {
                    webClient.close();
                }
            });

            describe('constructor', () => {
                it('should construct with default parameters', () => {
                    webClient = new WebClient();

                    expect(webClient instanceof WebClient).to.be.true;
                    expect((webClient as WebClient).host).to.equal('localhost');
                    expect((webClient as WebClient).port).to.equal(25003);
                    expect(webClient.socket).to.not.be.undefined;
                    expect(webClient.getLastUpdate).to.not.be.undefined;
                    expect(webClient.getScoreInfo).to.not.be.undefined;
                });

                it('should construct new host', () => {
                    webClient = new WebClient('new-host');

                    expect(webClient instanceof WebClient).to.be.true;
                    expect((webClient as WebClient).host).to.equal('new-host');
                    expect((webClient as WebClient).port).to.equal(25003);
                    expect(webClient.socket).to.not.be.undefined;
                    expect(webClient.getLastUpdate).to.not.be.undefined;
                    expect(webClient.getScoreInfo).to.not.be.undefined;
                });

                it('should construct new port', () => {
                    webClient = new WebClient('new-host', 42);

                    expect(webClient instanceof WebClient).to.be.true;
                    expect((webClient as WebClient).host).to.equal('new-host');
                    expect((webClient as WebClient).port).to.equal(42);
                    expect(webClient.socket).to.not.be.undefined;
                    expect(webClient.getLastUpdate).to.not.be.undefined;
                    expect(webClient.getScoreInfo).to.not.be.undefined;
                });

                it('should construct new host:port combo', () => {
                    webClient = new WebClient('new-host:42', 1337);

                    expect(webClient instanceof WebClient).to.be.true;
                    expect((webClient as WebClient).host).to.equal('new-host:42');
                    expect((webClient as WebClient).port).to.equal(42);
                    expect(webClient.socket).to.not.be.undefined;
                    expect(webClient.getLastUpdate).to.not.be.undefined;
                    expect(webClient.getScoreInfo).to.not.be.undefined;
                });

                it('should notify consumers of connection on Connect', () => {
                    const consoleSpy = sinon.spy(console, 'info');

                    webClient = new WebClient();
                    webClient.socket.emit('connect');

                    expect(consoleSpy.calledOnce);
                    expect(consoleSpy.calledWith('Connected'));

                    consoleSpy.restore();
                });

                it('should notify consumers of disconnecting on Disconnect', () => {
                    const consoleSpy = sinon.spy(console, 'info');

                    webClient = new WebClient();
                    webClient.socket.emit('disconnect');

                    expect(consoleSpy.calledOnce);
                    expect(consoleSpy.calledWith('Disconnected'));

                    consoleSpy.restore();
                });

                it('should notify consumers of new lastUpdate data', () => {
                    webClient = new WebClient();

                    const dateCmp = new Date('11/10/2017 7:52:40 AM');
                    const emitSpy = sinon.spy(webClient, 'emit');

                    webClient.socket.emit('lastUpdate', dateCmp);

                    expect(emitSpy.calledOnce);
                    expect(emitSpy.calledWith('lastUpdate', dateCmp));

                    emitSpy.restore();
                });

                it('should notify consumers of error with lastUpdate data', () => {
                    webClient = new WebClient();

                    const errorCmp = new Error('lastUpdateError');
                    const emitSpy = sinon.spy(webClient, 'emit');
                    const consoleSpy = sinon.spy(console, 'error');

                    webClient.socket.emit('lastUpdate', errorCmp);

                    expect(emitSpy.calledOnce);
                    expect(emitSpy.calledWith('lastUpdate', errorCmp));
                    expect(consoleSpy.calledOnce);
                    expect(consoleSpy.calledWith(errorCmp));

                    emitSpy.restore();
                    consoleSpy.restore();
                });

                it('should notify consumers of new scoreInfo data', () => {
                    webClient = new WebClient();

                    const scoreInfo: FLLScoreClient.IScoreInfo = {
                        scheduleInfo: {
                            lastUpdate: new Date('11/10/2017 7:52:40 AM'),
                            numberOfCompletedMatches: 6,
                            numberOfMatches: 36,
                            numberOfTeams: 12,
                        },
                        teamInfo: [
                            {number:16449, name: 'Dolphin Spiders', highScore: 310, scores: [310,-1,-1]},
                            {number:17557, name: 'Crimson Flying', highScore: 145, scores: [145,-1,-1]},
                            {number:23402, name: 'Striking Heroes', highScore: 270, scores: [270,-1,-1]},
                            {number:30150, name: 'Lightning Spanners', highScore: 275, scores: [275,-1,245]},
                            {number:33256, name: 'Alpha Secret Agents', highScore: -1, scores: [-1,-1,-1]},
                            {number:36131, name: 'Ice Mutants', highScore: 205, scores: [205,-1,-1]},
                            {number:41714, name: 'Muffin Bandits', highScore: -1, scores: [-1,-1,-1]},
                            {number:45406, name: 'Venomous Slammers', highScore: -1, scores: [-1,-1,-1]},
                            {number:48551, name: 'Sneaky Falcons', highScore: -1, scores: [-1,-1,-1]},
                            {number:61655, name: 'Extreme Dragons', highScore: -1, scores: [-1,-1,-1]},
                            {number:74638, name: 'Butterfly Racoons', highScore: -1, scores: [-1,-1,-1]},
                            {number:90436, name: 'Fire Bandits, highScore: ', highScore: -1, scores: [-1,-1,-1]},
                        ],
                    };
                    const emitSpy = sinon.spy(webClient, 'emit');

                    webClient.socket.emit('scoreInfo', scoreInfo);

                    expect(emitSpy.calledOnce);
                    expect(emitSpy.calledWith('scoreInfo', scoreInfo));

                    emitSpy.restore();
                });

                it('should notify consumers of error with scoreInfo data', () => {
                    webClient = new WebClient();

                    const errorCmp = new Error('scoreInfoError');
                    const emitSpy = sinon.spy(webClient, 'emit');
                    const consoleSpy = sinon.spy(console, 'error');

                    webClient.socket.emit('scoreInfo', errorCmp);

                    expect(emitSpy.calledOnce);
                    expect(emitSpy.calledWith('scoreInfo', errorCmp));
                    expect(consoleSpy.calledOnce);
                    expect(consoleSpy.calledWith(errorCmp));

                    emitSpy.restore();
                    consoleSpy.restore();
                });
            });

            describe('getLastUpdate', () => {
                let emitStub;

                const dateCmp = new Date('11/10/2017 7:52:40 AM');

                beforeEach(() => {
                    webClient = new WebClient();
                    emitStub = sinon.stub(webClient.socket, 'emit');
                    emitStub.callsFake((ev, m, cb) => {
                        if(ev === 'sendLastUpdate') {
                            expect(m.toString()).to.equal('please');
                            cb('11/10/2017 7:52:40 AM');
                        }
                    });
                });

                afterEach(() => {
                    emitStub.restore();
                });

                it('should request lastUpdate when it is undefined', () => {
                    return webClient.getLastUpdate().then((res) => {
                        expect(res).to.equalDate(dateCmp);
                        expect(emitStub).to.have.been.calledOnce;
                    });
                });

                it('should resolve to lastUpdate when it is not undefined', () => {
                    return webClient.getLastUpdate().then((res) => {
                        expect(res).to.equalDate(dateCmp);
                        expect(emitStub).to.have.been.calledOnce;
                        return webClient.getLastUpdate();
                    }).then((res) => {
                        expect(res).to.equalDate(dateCmp);
                        expect(emitStub).to.have.been.calledOnce;
                    });
                });

                it('should reject when an error is sent', () => {
                    emitStub.resetBehavior();
                    emitStub.callsFake((ev, m, cb) => {
                        if(ev === 'sendLastUpdate') {
                            expect(m.toString()).to.equal('please');
                            cb(new Error('lastUpdateError'));
                        }
                    });

                    return webClient.getLastUpdate().catch((err: Error) => {
                        expect(err.message).to.equal('lastUpdateError');
                    });
                });
            });

            describe('getScoreInfo', () => {
                let emitStub;

                beforeEach(() => {
                    webClient = new WebClient();
                    emitStub = sinon.stub(webClient.socket, 'emit');
                    emitStub.callsFake((ev, m, cb) => {
                        if(ev === 'sendScoreInfo') {
                            expect(m.toString()).to.equal('please');
                            const info: FLLScoreClient.IScoreInfo = {
                                scheduleInfo: {
                                    lastUpdate: new Date('11/10/2017 7:52:40 AM'),
                                    numberOfCompletedMatches: 6,
                                    numberOfMatches: 36,
                                    numberOfTeams: 12,
                                },
                                teamInfo: [
                                    {number:16449, name: 'Dolphin Spiders', highScore: 310, scores: [310,-1,-1]},
                                    {number:17557, name: 'Crimson Flying', highScore: 145, scores: [145,-1,-1]},
                                    {number:23402, name: 'Striking Heroes', highScore: 270, scores: [270,-1,-1]},
                                    {number:30150, name: 'Lightning Spanners', highScore: 275, scores: [275,-1,245]},
                                    {number:33256, name: 'Alpha Secret Agents', highScore: -1, scores: [-1,-1,-1]},
                                    {number:36131, name: 'Ice Mutants', highScore: 205, scores: [205,-1,-1]},
                                    {number:41714, name: 'Muffin Bandits', highScore: -1, scores: [-1,-1,-1]},
                                    {number:45406, name: 'Venomous Slammers', highScore: -1, scores: [-1,-1,-1]},
                                    {number:48551, name: 'Sneaky Falcons', highScore: -1, scores: [-1,-1,-1]},
                                    {number:61655, name: 'Extreme Dragons', highScore: -1, scores: [-1,-1,-1]},
                                    {number:74638, name: 'Butterfly Racoons', highScore: -1, scores: [-1,-1,-1]},
                                    {number:90436, name: 'Fire Bandits, highScore: ', highScore: -1, scores: [-1,-1,-1]},
                                ],
                            };
                            cb(info);
                        }
                    });
                });

                it('should request scoreInfo when it is undefined', () => {
                    return webClient.getScoreInfo().then((res:FLLScoreClient.IScoreInfo) => {
                        expect(res.scheduleInfo).to.not.be.undefined;
                        expect(res.teamInfo).to.not.be.undefined;
                        expect(res.scheduleInfo.numberOfTeams).to.equal(12);
                        expect(res.teamInfo.length).to.equal(12);
                        expect(res.teamInfo[0].number).to.equal(16449);
                        expect(emitStub).to.have.been.calledOnce;
                        emitStub.restore();
                    });
                });

                it('should resolve to scoreInfo when it is not undefined', () => {
                    return webClient.getScoreInfo().then((res:FLLScoreClient.IScoreInfo) => {
                        expect(res.scheduleInfo).to.not.be.undefined;
                        expect(res.teamInfo).to.not.be.undefined;
                        expect(res.scheduleInfo.numberOfTeams).to.equal(12);
                        expect(res.teamInfo.length).to.equal(12);
                        expect(res.teamInfo[0].number).to.equal(16449);
                        expect(emitStub).to.have.been.calledOnce;
                        return webClient.getScoreInfo();
                    }).then((res) => {
                        expect(res.scheduleInfo).to.not.be.undefined;
                        expect(res.teamInfo).to.not.be.undefined;
                        expect(res.scheduleInfo.numberOfTeams).to.equal(12);
                        expect(res.teamInfo.length).to.equal(12);
                        expect(res.teamInfo[0].number).to.equal(16449);
                        expect(emitStub).to.have.been.calledOnce;
                        emitStub.restore();
                    });
                });

                it('should reject when an error is sent', () => {
                    emitStub.resetBehavior();
                    emitStub.callsFake((ev, m, cb) => {
                        if(ev === 'sendScoreInfo') {
                            expect(m.toString()).to.equal('please');
                            cb(new Error('scoreInfoError'));
                        }
                    });

                    return webClient.getScoreInfo().catch((err: Error) => {
                        expect(err.message).to.equal('scoreInfoError');
                    });
                });
            });
        });
    }
}