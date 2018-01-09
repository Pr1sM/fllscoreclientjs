var client = fllscoreclient.createWebClient('0.0.0.0', 8101);

client.connect().then(function(res) {
    console.log(res);
    return client.sendPing();
}).then(function(res) {
    console.log(res);
    return client.sendLastUpdate();
}).then(function(res) {
    console.log(res.toString());
    console.log(client.lastUpdate.toISOString());
    return new Promise(function (resolve) {
        setTimeout(resolve, 20000);
    });
}).then(function() {
    return client.sendScore();
}).then(function(res) {
    console.log(JSON.stringify(res));
    return client.sendLastUpdate();
}).then(function(res) {
    console.log(res.toString());
    return client.close();
}).then(function(res) {
    console.log(res);
}).catch(function(err) {
    console.log('Rejected: ' + err.message);
});