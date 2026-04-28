const mineflayer = require('mineflayer');
const http = require('http');

// 1. RENDER HEALTH CHECK SERVER
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('IamHim is active and running.\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
});

// 2. BOT CONFIGURATION
const botArgs = {
    host: 'blackout.mcsh.io',
    username: 'IamHim',
    version: '1.20.1' 
};

let bot;
let sessionTimeout;

function createBot() {
    bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log('Bot spawned: IamHim is online.');
        
        // --- ANTI-BOT MOVEMENT ---
        const moveInterval = setInterval(() => {
            if (!bot.entity) return;
            const actions = ['forward', 'back', 'left', 'right', 'jump'];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            bot.setControlState(randomAction, true);
            setTimeout(() => bot.setControlState(randomAction, false), 800);
        }, 25000);

        // --- SESSION TIMER (1 Hour Online -> 5 Mins Offline) ---
        // Clear any existing timer to prevent duplicates
        if (sessionTimeout) clearTimeout(sessionTimeout);

        sessionTimeout = setTimeout(() => {
            console.log('1 hour reached. Leaving for 5 minutes to simulate a break...');
            clearInterval(moveInterval); // Stop movement logic
            bot.quit(); // Disconnect from server
        }, 3600000); // 1 hour in milliseconds
    });

    bot.on('message', (jsonMsg) => {
        const message = jsonMsg.toString();
        if (message.includes('/register')) {
            bot.chat('/register iamthebest iamthebest');
        } else if (message.includes('/login')) {
            bot.chat('/login iamthebest');
        }
    });

    bot.on('death', () => bot.respawn());

    bot.on('end', (reason) => {
        if (reason === 'quit') {
            // This was our planned 5-minute break
            console.log('Waiting 5 minutes before rejoining...');
            setTimeout(createBot, 300000); // 5 minutes in milliseconds
        } else {
            // This was an accidental disconnect or kick
            console.log('Unexpected disconnect. Reconnecting in 10 seconds...');
            setTimeout(createBot, 10000);
        }
    });

    bot.on('error', (err) => console.log('Connection Error:', err));
}

// Start the first session
createBot();
