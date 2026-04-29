const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const http = require('http');

// 1. RENDER HEALTH CHECK
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('IamHim is active\n');
});
server.listen(process.env.PORT || 8080);

// 2. BOT CONFIGURATION
const botArgs = {
    host: 'blackout.mcsh.io',
    username: 'IamHim', // This sets the bot's name
    version: '1.20.1'
};

let bot;
let sessionTimeout;

function createBot() {
    bot = mineflayer.createBot(botArgs);

    // Load pathfinder for human movement
    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log(`[${bot.username}] spawned!`);
        
        const mcData = require('minecraft-data')(bot.version);
        const defaultMove = new Movements(bot, mcData);

        // HUMAN MOVEMENT LOGIC
        const roamInterval = setInterval(() => {
            if (!bot.entity) return;

            // Randomly decide to walk to a nearby location (within 5-10 blocks)
            const x = (Math.random() - 0.5) * 15;
            const z = (Math.random() - 0.5) * 15;
            const goal = new goals.GoalNear(bot.entity.position.x + x, bot.entity.position.y, bot.entity.position.z + z, 1);
            
            bot.pathfinder.setMovements(defaultMove);
            bot.pathfinder.setGoal(goal);

            // Occasionally look around randomly
            bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
            
        }, 45000); // Walk to a new spot every 45 seconds

        // SESSION TIMER (1 Hour Online -> 5 Mins Offline)
        if (sessionTimeout) clearTimeout(sessionTimeout);
        sessionTimeout = setTimeout(() => {
            console.log('Taking a 5-minute break...');
            clearInterval(roamInterval);
            bot.quit();
        }, 3600000); 
    });

    // AUTH LOGIC
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
            setTimeout(createBot, 300000); // Wait 5 mins
        } else {
            setTimeout(createBot, 10000); // Reconnect fast if kicked
        }
    });

    bot.on('error', (err) => console.log('Error:', err));
}

createBot();
