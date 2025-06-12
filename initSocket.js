const net = require('net');

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => {
            resolve(false); // port đang bị chiếm
        });

        server.once('listening', () => {
            server.close();
            resolve(true); // port trống
        });

        server.listen(port);
    });
}

async function findFreePort(start = 8000, end = 8100) {
    for (let port = start; port <= end; port++) {
        const isFree = await checkPort(port);
        if (isFree) return port;
    }
    throw new Error('No free port found');
}


module.exports = {
    findFreePort
}
