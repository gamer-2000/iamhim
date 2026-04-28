const mineflayer = require('mineflayer');
const http = require('http');

// 1. Create a dummy server for Render's health check
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is active\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
});

// 2. Bot Configuration
const botArgs = {
    host: 'blackout.mcsh.io',
    username: 'IamHim',
    version: '1.20.1' // Ensure this matches the server version
};

let bot;

function createBot() {
    bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log('Bot spawned: IamHim is in the game.');
        
        // Anti-Bot/AFK Bypass: Random Movement
        setInterval(() => {
            const actions = ['forward', 'back', 'left', 'right', 'jump'];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            
            bot.setControlState(randomAction, true);
            setTimeout(() => {
                bot.setControlState(randomAction, false);
            }, 500); // Move for half a second
        }, 20000); // Repeat every 20 seconds
    });

    bot.on('message', (jsonMsg) => {
        const message = jsonMsg.toString();
        console.log(`[Chat]: ${message}`);

        // Auth Logic
        if (message.includes('/register')) {
            bot.chat('/register iamthebest iamthebest');
        } else if (message.includes('/login')) {
            bot.chat('/login iamthebest');
        }
    });

    // Handle Errors and Reconnection
    bot.on('error', (err) => console.log('Error:', err));
    bot.on('end', () => {
        console.log('Disconnected. Attempting to reconnect...');
        setTimeout(createBot, 5000);
    });
}

createBot();
