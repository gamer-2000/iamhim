const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const tool = require('mineflayer-tool').plugin;
const http = require('http');

/**
 * 1. RENDER STABILITY & HEALTH CHECK
 * Designed to work with Cron-job.org to prevent Render from sleeping.
 */
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('IamHim Bot Status: Operational\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[System] Health check server active on port ${PORT}`);
});

/**
 * 2. BOT CONFIGURATION
 */
const botArgs = {
    host: 'blackout.mcsh.io',
    username: 'IamHim',
    version: '1.20.1',
    hideErrors: true // Prevents log spam from minor packet drops
};

let bot;
let sessionTimeout;
let breakTimeout;

function createBot() {
    console.log('[System] Attempting to connect to Minecraft server...');
    bot = mineflayer.createBot(botArgs);

    // Load necessary plugins
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);
    bot.loadPlugin(tool);

    // --- EVENT: SPAWN ---
    bot.on('spawn', () => {
        console.log(`[Game] ${bot.username} has spawned successfully.`);
        
        const mcData = require('minecraft-data')(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);

        // --- HUMAN MOVEMENT LOGIC ---
        // Moves the bot to a random nearby spot every 45-60 seconds
        const moveInterval = setInterval(() => {
            if (!bot.entity) return;
            
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            const goal = new goals.GoalNear(bot.entity.position.x + x, bot.entity.position.y, bot.entity.position.z + z, 2);
            
            bot.pathfinder.setGoal(goal);
            // Random look-around
            bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
        }, 50000);

        // --- SESSION TIMER (1 Hour Online -> 5 Mins Offline) ---
        if (sessionTimeout) clearTimeout(sessionTimeout);
        sessionTimeout = setTimeout(() => {
            console.log('[System] Session complete. Taking 5-minute break...');
            clearInterval(moveInterval);
            bot.quit('break');
        }, 3600000);
    });

    // --- CHAT / AUTH LOGIC ---
    bot.on('message', (jsonMsg) => {
        const msg = jsonMsg.toString();
        // Log messages for debugging via Render logs
        if (msg.includes('/register')) {
            bot.chat('/register iamthebest iamthebest');
        } else if (msg.includes('/login')) {
            bot.chat('/login iamthebest');
        }
    });

    // --- GRINDING COMMAND ---
    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        if (message.startsWith('collect ')) {
            const blockName = message.split(' ')[1];
            const mcData = require('minecraft-data')(bot.version);
            const blockType = mcData.blocksByName[blockName];

            if (!blockType) return bot.chat("Unknown block name.");
            
            const blocks = bot.findBlocks({ matching: blockType.id, maxDistance: 32, count: 1 });
            if (blocks.length > 0) {
                bot.chat(`Grinding ${blockName}...`);
                try {
                    await bot.collectBlock.collect(bot.blockAt(blocks[0]));
                } catch (e) { console.log(e); }
            }
        }
    });

    // --- AUTO-RESPAWN ---
    bot.on('death', () => {
        console.log('[Game] Bot died. Respawning...');
        bot.respawn();
    });

    // --- RECONNECT LOGIC (The most important part for Render) ---
    bot.on('end', (reason) => {
        console.log(`[System] Connection ended: ${reason}`);
        
        // Clear session timer to prevent overlap
        if (sessionTimeout) clearTimeout(sessionTimeout);

        if (reason === 'break') {
            setTimeout(createBot, 300000); // 5 minute break
        } else {
            // Reconnect in 20 seconds for accidental drops
            setTimeout(createBot, 20000);
        }
    });

    bot.on('error', (err) => {
        console.error('[System] Critical Error:', err.message);
        // Do not crash, just let the 'end' event handle the reconnect
    });
}

// Ensure the bot shuts down cleanly if Render stops the container
process.on('SIGTERM', () => {
    console.log('[System] Received SIGTERM. Shutting down gracefully.');
    if (bot) bot.quit();
    process.exit(0);
});

createBot();
