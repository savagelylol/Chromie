/** PACKAGES v2: IMPORT */
const puppeteer = require('puppeteer');
const EventEmitter = require('events').EventEmitter;
const Eris = require('eris');
const chalk = require('chalk');
const BrowserAdapter = require('./utils/browserAdapter');
const knex = require('knex');

// Database connection
const db = knex({
  client: 'pg',
  connection: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  pool: { min: 0, max: 5 }
});

/** VERSION: CHANGE THIS TO UPDATE BOT VERSION */
const BOT_VERSION = 'v4.0.1';

/** BLACKLIST: CHANGE, ADD OR REMOVE KEYWORDS HERE */
const NSFW_LIST = 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en';
const blacklist = [
        // System/Security
        'localhost', 'tcp', 'ngrok', 'file', 'settings', 'chrome://', 'ip', 'address', 'internet', 'wifi', 'network', 'packet',

        // Adult Content - General Keywords
       'sophie rain', 'porn', 'sex', 'xxx', 'hentai', 'nsfw', 'nude', 'naked', 'adult', 'erotic', 'onlyfans',
        'camgirl', 'webcam', 'livecam', 'sexcam', 'stripchat', 'chaturbate', 'cam4', 'bongacams',
        'lesbian', 'gay', 'milf', 'teen', 'anal', 'blowjob', 'cumshot', 'creampie', 'gangbang',
        'fetish', 'bdsm', 'bondage', 'footjob', 'handjob', 'orgy', 'threesome', 'swinger',

        // Major Adult Video Sites
        'pornhub', 'xvideos', 'xnxx', 'redtube', 'youporn', 'tube8', 'spankwire', 'keezmovies',
        'pornmd', 'xtube', 'xhamster', 'beeg', 'upornia', 'txxx', 'drtuber', 'slutload',
        'tnaflix', 'empflix', 'mofosex', 'nuvid', 'forhertube', 'sunporno', 'porntrex',
        'spankbang', 'eporner', 'porngo', 'tubegalore', 'porn.com', 'sex.com', 'xnxx.com',
        'hqporner', 'pornktube', 'pornerbros', 'freeones', 'motherless', 'fuq', 'hdzog',

        // Premium Adult Sites
        'brazzers', 'bangbros', 'realitykings', 'naughtyamerica', 'babes.com', 'playboy', 'penthouse',
        'digitalplayground', 'wicked', 'vivid', 'hustler', 'evilangel', 'julesjordan',
        'teamskeet', 'nubiles', 'passion-hd', 'pornpros', 'mofos', 'fake', 'publicagent',

        // Image/Gallery Sites
        'imagefap', 'xnxx.com', 'rule34', 'gelbooru', 'danbooru', 'e621', 'paheal',
        'hentai-foundry', 'nhentai', 'fakku', 'tsumino', 'hitomi', 'simply-hentai',

        // Camming/Live Sites
        'chaturbate', 'stripchat', 'cam4', 'bongacams', 'myfreecams', 'camsoda', 'flirt4free',
        'livejasmin', 'streamate', 'imlive', 'xlovecam', 'naked.com', 'cams.com',

        // OnlyFans & Similar
        'onlyfans', 'fansly', 'patreon', 'manyvids', 'clips4sale', 'iwantclips', 'loyalfans',

        // Dating/Hookup with Adult Content
        'adultfriendfinder', 'ashleymadison', 'fling', 'benaughty', 'alt.com', 'passion.com',

        // Hentai/Anime Adult
        'hentai', 'nhentai', 'hanime', 'hentaihaven', 'fakku', 'tsumino', 'hitomi',
        'doujin', 'ecchi', 'oppai', 'ahegao', 'futanari', 'yaoi', 'yuri',

        // Torrent/Piracy Adult
        'empornium', 'pornbay', 'pornolab', 'pornleech', 'pornolab',

        // Forums/Communities
        'reddit.com/r/nsfw', '/r/gonewild', '/r/realgirls', 'lpsg', 'sex.com',
        '4chan.org/b/', '4chan.org/r/', '8chan', '8kun',

        // Misc Adult Keywords
        'escort', 'hooker', 'prostitute', 'brothel', 'redlight', 'xxx', 'porno',
        'sexx', 'sexo', 'sexy', 'boobs', 'tits', 'ass', 'pussy', 'dick', 'cock',
        'vagina', 'penis', 'orgasm', 'masturbat', 'dildo', 'vibrator', 'fleshlight',

        // Common Misspellings/Bypasses
        'p0rn', 'pr0n', 's3x', 'sexx', 'p**n', 's*x', 'pr0nhub', 'xvideo',
        'p o r n', 's e x', 'p.o.r.n', 's.e.x',

        // Top Level Domains commonly used
        '.xxx', '.adult', '.porn', '.sex',

        // Proxy/VPN sites that might bypass
        'vpnbook', 'hidemyass', 'proxfree', 'kproxy', 'filterbypass', 'proxysite',
        'unblockall', 'unblocker', 'youtubeunblocked', 'unblockit',

        // Additional Sites
        'redgifs', 'gfycat.com/nsfw', 'imgur.com/r/nsfw', 'tumblr.com/nsfw',
        'flickr.com/adult', 'deviantart.com/mature', 'omegle', 'chatroulette'
];
const blacklistExceptions = ['google.com/sorry']; // URLs that should be allowed despite containing blacklisted keywords
const obscureResponseURL = 'https://cdn.discordapp.com/attachments/907306705090646066/1060484860122247178/Untitle41d.png';

/** PLUGINS: IMPORT */
const plugin = require('./utils/plugin');
const { collectInteractions } = require('./utils/interactionCollector');
const { getUserSettings, setUserSettings } = require('./utils/settings');
const { 
    checkRateLimit, 
    validateURL, 
    sanitizeInput, 
    hasPermission,
    sanitizeSessionData 
} = require('./utils/security');

/**VARIABLES: DATA SET */
const data = [];
const obscureWords = new Map();

// Per-guild session management
const guildSessions = new Map(); // Map<guildId, SessionData>

// Rate limiting
const userRateLimits = new Map(); // Map<userId, { count, resetTime }>
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 commands per minute

// Cleanup expired rate limits every 5 minutes to prevent memory leaks
const rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, limit] of userRateLimits) {
        if (now > limit.resetTime) {
            userRateLimits.delete(userId);
        }
    }
}, 300000);

let responseBuffer;
let chromeLaunchOptions;
let browser;
let browserType;
let page;
let runningUser;
let messageID;
let collector;
let mouseModifier;
let x;
let y;
let date;
let urlHistory;
let currentHistoryIndex;
let currentBrowserType;
let performanceInterval;
let filterListener;
let startTime; // Added startTime variable
let maxSessionDuration = 300000; // Default to 5 minutes, will be overridden by user settings

// Session data structure
class SessionData {
    constructor() {
        this.messageID = null;
        this.browser = null;
        this.browserType = 'puppeteer';
        this.page = null;
        this.runningUser = null;
        this.collector = null;
        this.mouseModifier = 70;
        this.x = 980;
        this.y = 400;
        this.date = null;
        this.urlHistory = [];
        this.currentHistoryIndex = -1;
        this.currentBrowserType = 'chrome';
        this.performanceInterval = null;
        this.filterListener = new EventEmitter();
        this.data = [];
    }
}


/** FUNCTIONS: INIT */

async function loadFilters() {
        try {
            const fetchData = await fetch(NSFW_LIST);
            const text = await fetchData.text();
            const words = text.split('\n').filter(w => w.trim());

            // Use Map for O(1) lookups instead of array iteration
            words.forEach(word => obscureWords.set(word.toLowerCase(), true));

            console.log(chalk.green(`✓ Loaded ${obscureWords.size} NSFW filters`));
        } catch (e) {
            console.log(chalk.yellow('⚠️  Failed to load NSFW word list, using blacklist only'));
        }
}

function getBrowserByType(browserType) {
        return browser;
}

// Ensure Chrome browser is available
async function ensureBrowser(chromeLaunchOptions) {
        try {
                // Check if we already have a connected instance
                if (BrowserAdapter.isConnected(browser, browserType)) {
                        console.log(chalk.green('✓ Chrome browser already connected'));
                        // Close current page
                        if (page) {
                                try {
                                        await page.close();
                                } catch (e) {
                                        // Ignore if page already closed
                                }
                                page = null;
                        }
                        return true;
                }

                console.log(chalk.cyan('🌐 Launching Chrome browser...'));

                // Close current page
                if (page) {
                        try {
                                await page.close();
                        } catch (e) {
                                // Ignore if page already closed
                        }
                        page = null;
                }

                // Launch Chrome with Puppeteer
                const result = await BrowserAdapter.launchChrome(chromeLaunchOptions);
                browser = result.browser;
                browserType = result.type;
                return true;
        } catch (e) {
                console.log(chalk.red('✗ Browser launch failed'));
                console.log(chalk.dim('   Error:'), e.message);
                return false;
        }
}

async function resetProcess(guildId, sussyFilter, targetBrowser = 'chrome') {
        console.log(chalk.yellow(`🔄 Resetting browser session for guild ${guildId}...`));

        let session = guildSessions.get(guildId);
        if (!session) {
            session = new SessionData();
            guildSessions.set(guildId, session);
        }

        session.runningUser = undefined;
        session.urlHistory.length = 0;
        session.currentHistoryIndex = -1;
        session.currentBrowserType = 'chrome';

        if (session.performanceInterval) {
                clearInterval(session.performanceInterval);
                session.performanceInterval = null;
        }

        if (session.page) {
                try {
                        await session.page.close();
                } catch (e) {
                        // Ignore if already closed
                }
                session.page = null;
        }

        // Create isolated browser instance for this guild
        let activeBrowser, activeType;

        if (!session.browser) {
            const result = await BrowserAdapter.launchChrome(chromeLaunchOptions);
            session.browser = result.browser;
            session.browserType = result.type;
        }
        activeBrowser = session.browser;
        activeType = session.browserType;

        if (!activeBrowser) {
                console.log(chalk.red('✗ No active browser available'));
                return false;
        }

        // Get user settings for dark mode (use default if no user)
        const currentUserSettings = session.runningUser ? getUserSettings(session.runningUser) : { darkMode: true };

        // Create page using BrowserAdapter for proper API normalization
        session.page = await BrowserAdapter.createPage(activeBrowser, activeType, currentUserSettings.darkMode);

        await session.page.setViewport({
                width: 1920,
                height: 1080,
        });

        await plugin(session.page);

        // Set up anti-bot notification callback
        session.page._antiBotNotificationCallback = async (pattern, alternative) => {
                try {
                        const detectedSite = pattern.includes('google') ? 'Google' : 
                                            pattern.includes('bing') ? 'Bing' :
                                            pattern.includes('yahoo') ? 'Yahoo' : 'the website';

                        // Ensure session.messageID is available and has channel.id
                        if (!session.messageID || !session.messageID.channel || !session.messageID.channel.id) {
                                console.log(chalk.yellow('⚠️  Cannot send anti-bot notification: Missing messageID or channel information.'));
                                return;
                        }

                        await bot.createMessage(session.messageID.channel.id, {
                                embeds: [{
                                        title: '🛡️ Discordmium Stealth Protection',
                                        description: `**Anti-bot page detected and bypassed!**\n\n` +
                                                   `${detectedSite} tried to show you a captcha/verification page, but Discordmium Stealth automatically protected you and redirected to a safer alternative.\n\n` +
                                                   `**What happened:**\n` +
                                                   `• Detected: \`${pattern}\`\n` +
                                                   `• Redirected to: ${alternative}\n\n` +
                                                   `You can continue browsing normally! 🚀`,
                                        color: 0x00FF00,
                                        footer: {
                                                text: 'Powered by Puppeteer Stealth'
                                        },
                                        timestamp: new Date()
                                }],
                                components: [{
                                        type: 1,
                                        components: [{
                                                type: 2,
                                                label: 'Dismiss',
                                                custom_id: `dismiss_${Date.now()}`,
                                                style: 2,
                                                emoji: { name: '✅' }
                                        }]
                                }]
                        });
                } catch (e) {
                        console.log(chalk.yellow('⚠️  Could not send anti-bot notification:'), e.message);
                }
        };

        // Apply security measures
        sanitizeSessionData(session);

        await session.page.goto('https://google.com');
        console.log(chalk.green('✓ Browser session ready'));

        if (sussyFilter) {
                if (obscureWords.size === 0) {
                    await loadFilters();
                }

                /** ATTACH A REDIRECT LISTENER FOR POSSIBLE SUSPICIOUS WEBSITES/KEYWORDS */
                session.page.on('response', async response => {
                        const status = response.status();

                        if ((status >= 300) && (status <= 399)) {
                                const NSFW_OR_NOT = await sussySearch(response.headers()['location']);

                                if (NSFW_OR_NOT === true) {
                                        console.log(chalk.red('⚠️  Blocked suspicious redirect:'), chalk.dim(response.headers()['location']));
                                        const interval = setInterval(() => {
                                                if (session.filterListener.listenerCount('redirect') !== 0) {
                                                        session.filterListener.emit('redirect', NSFW_OR_NOT);
                                                        clearInterval(interval);
                                                }
                                        }, 100);
                                }
                        }
                });
        }

        await session.page.mouse.move(session.x, session.y);
        return true;
}

/**
 * Sync session variables to global variables for compatibility with legacy code
 * @param {SessionData} session The session to sync from
 */
function syncSessionToGlobals(session) {
        if (!session) return;
        page = session.page;
        urlHistory = session.urlHistory;
        currentHistoryIndex = session.currentHistoryIndex;
        currentBrowserType = session.currentBrowserType;
        filterListener = session.filterListener;
        mouseModifier = session.mouseModifier;
        x = session.x;
        y = session.y;
        runningUser = session.runningUser;
        date = session.date;
        messageID = session.messageID; // Also sync messageID
}

/**
 * Turn an URL to Buffer
 * @param {String} url The url to fetch for buffer.
 * @returns Buffer
 */
async function buffer(url) {
        const response = await fetch(url);
        const bufferdata = await response.arrayBuffer();

        return Buffer.from(new Uint8Array(bufferdata), 'utf-8');
}

/**
 * Filter suspicious exploits/obscure keywords.
 * @param {String} content The content which will be used to search for obscure/exploits.
 * @returns Boolean
 */
async function sussySearch(content) {
        if (!content || typeof content !== 'string') return false;

        content = content.toLowerCase();

        // Check if URL is in exceptions list first
        if (blacklistExceptions.some(exception => content.includes(exception))) {
                return false;
        }

        // First check our custom blacklist (porn sites, etc.)
        if (blacklist.some(word => content.includes(word))) {
                return true;
        }

        // Check NSFW word list - use substring matching for comprehensive detection
        // This ensures we catch words embedded in URLs (pornhub.com), punctuated text (badword!),
        // hyphenated words, and all variations while still being efficient
        for (const [word] of obscureWords) {
            if (content.includes(word)) {
                return true;
            }
        }

        return false;
}

/**
 * The move function that manages the mouse.
 * @param {String} dir The directions where the mouse shall be moved. (click, up, down, left, right)
*/
async function move(dir) {
        if (dir === 'click') await page.mouse.click(x, y);
        if (dir === 'up' && y > 0) {
                y = Math.max(0, y - mouseModifier);
                await page.mouse.move(x, y);
        }
        if (dir === 'down' && y < 1080) {
                y = Math.min(1080, y + mouseModifier);
                await page.mouse.move(x, y);
        }
        if (dir === 'left' && x > 0) {
                x = Math.max(0, x - mouseModifier);
                await page.mouse.move(x, y);
        }
        if (dir === 'right' && x < 1920) {
                x = Math.min(1920, x + mouseModifier);
                await page.mouse.move(x, y);
        }
}

/**
 * Update the message for video output.
 * @param {*} int The interaction to edit.
 * @param {*} messageObject The message object that shall be shown once the message is edited.
*/
async function update(int, messageObject) {
        const screenshotQuality = getUserSettings(runningUser).screenshotQuality || 80;
        const screenshot = await page.screenshot({
                type: screenshotQuality < 100 ? 'jpeg' : 'png',
                quality: screenshotQuality < 100 ? screenshotQuality : undefined
        });

        await int.editOriginalMessage(messageObject, { name: 'file.png', file: screenshot });
}

async function startPerformanceMode(bot, userId, interval) {
        if (performanceInterval) {
                clearInterval(performanceInterval);
        }

        if (runningUser === userId && page && messageID) {
                console.log(chalk.green('⚡ Starting performance mode with interval:'), chalk.yellow(`${interval}ms`));

                performanceInterval = setInterval(async () => {
                        try {
                                if (!page || !messageID) {
                                        clearInterval(performanceInterval);
                                        performanceInterval = null;
                                        return;
                                }

                                const screenshotQuality = getUserSettings(userId).screenshotQuality || 80;
                                const screenshot = await page.screenshot({
                                        type: screenshotQuality < 100 ? 'jpeg' : 'png',
                                        quality: screenshotQuality < 100 ? screenshotQuality : undefined
                                });

                                // Update with proper embed structure
                                await bot.editMessage(messageID.channel.id, messageID.id, {
                                        content: '\u200b',
                                        embeds: [{
                                                image: { url: 'attachment://file.png' },
                                                color: 0x00BFFF,
                                                footer: {
                                                        text: `Discordmium ${BOT_VERSION} • Chromie`
                                                }
                                        }]
                                }, { name: 'file.png', file: screenshot });

                                console.log(chalk.dim('⚡ Performance mode: Screenshot updated'));
                        } catch (e) {
                                if (!e.message.includes('Target closed')) {
                                        console.log(chalk.yellow('⚠️  Performance mode update failed:'), chalk.dim(e.message));
                                }
                                clearInterval(performanceInterval);
                                performanceInterval = null;
                        }
                }, interval);
        }
}

async function stopPerformanceMode() {
        if (performanceInterval) {
                clearInterval(performanceInterval);
                performanceInterval = null;
                console.log(chalk.yellow('⚡ Performance mode stopped'));
        }
}

/** EXPORT CODE */

// Graceful shutdown handler to cleanup browser processes
async function gracefulShutdown(signal) {
    console.log(chalk.yellow(`\n${signal} received. Cleaning up...`));
    try {
        // Clear rate limit cleanup interval
        clearInterval(rateLimitCleanupInterval);
        
        // Close global browser instance
        if (browser) {
            await BrowserAdapter.closeBrowser(browser, browserType);
            console.log(chalk.green('✓ Global browser closed'));
        }
        // Close all per-guild session resources
        for (const [guildId, session] of guildSessions) {
            if (session.performanceInterval) {
                clearInterval(session.performanceInterval);
            }
            if (session.page) {
                try { await session.page.close(); } catch (e) {}
            }
            // Close per-guild browser instances if they exist
            if (session.browser && session.browser !== browser) {
                try { 
                    await BrowserAdapter.closeBrowser(session.browser, session.browserType);
                } catch (e) {}
            }
        }
        guildSessions.clear();
        console.log(chalk.green('✓ Sessions cleaned up'));
    } catch (e) {
        console.log(chalk.yellow('⚠️  Cleanup error:'), e.message);
    }
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * The main browse function.
 * @param {String} token The Discord bot token which we'll use to connect to Discord.
 * @param {Number} clearTime The time allocated to each user (default: 300000 | Milliseconds)
 * @param {Boolean} sussyFilter The filter for suspicious searches and sites (default: true)
 * @param {Object} statusConfig Bot status configuration (optional)
 */
module.exports = async function browse(token, clearTime = 300000, sussyFilter = true, statusConfig = {}) {

        const bot = new Eris(token, { intents: ['allNonPrivileged', 'guildMessages'] });

        responseBuffer = await buffer(obscureResponseURL);

        chromeLaunchOptions = {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                chromeLaunchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        // Launch initial Chrome browser with BrowserAdapter
        const result = await BrowserAdapter.launchChrome(chromeLaunchOptions);
        browser = result.browser;
        browserType = result.type;

        // Initialize global variables that are used in many places
        startTime = Date.now(); // Initialize startTime
        maxSessionDuration = clearTime; // Set maxSessionDuration

        const initialReset = await resetProcess(null, sussyFilter); // Pass null for guildId as it's not used here
        if (!initialReset) {
                console.log(chalk.red('✗ Failed to initialize browser session'));
                throw new Error('Browser initialization failed');
        }

        // Sync initial session to globals for startup handlers
        const initialSession = guildSessions.get(null);
        if (initialSession) {
                syncSessionToGlobals(initialSession);
        }

        bot.on('ready', async () => {
                console.log(chalk.green(`✓ Connected as ${bot.user.username}#${bot.user.discriminator}`));

                // Cache bot's guilds in database for dashboard access
                try {
                        const botGuilds = bot.guilds;
                        console.log(chalk.cyan(`📊 Bot is in ${botGuilds.size} guilds`));

                        // Store bot presence for each guild
                        for (const guild of botGuilds.values()) {
                                // First ensure the guild exists in the guilds table
                                await db('guilds')
                                        .insert({
                                                id: guild.id,
                                                name: guild.name,
                                                icon: guild.icon || null,
                                                owner_id: guild.ownerID || 'unknown'
                                        })
                                        .onConflict('id')
                                        .merge({
                                                name: guild.name,
                                                icon: guild.icon || null,
                                                updated_at: db.fn.now()
                                        });

                                // Then store bot presence setting
                                await db('guild_settings')
                                        .insert({
                                                guild_id: guild.id,
                                                setting_key: 'bot_present',
                                                setting_value: JSON.stringify(true)
                                        })
                                        .onConflict(['guild_id', 'setting_key'])
                                        .merge({
                                                setting_value: JSON.stringify(true),
                                                updated_at: db.fn.now()
                                        });
                        }
                        console.log(chalk.green('✓ Guild cache updated'));
                } catch (error) {
                        console.error(chalk.red('Error caching guilds:'), error);
                }

                // Set bot status
                const status = statusConfig.status || 'streaming';
                const activityType = statusConfig.activityType || 1;
                const activityName = statusConfig.activityName || 'Myself Surfing The Web';

                bot.editStatus(status, {
                        name: activityName,
                        type: activityType
                });

                // Register commands globally for all servers
                bot.bulkEditCommands([
                        {
                                name: 'browse',
                                description: 'open a virtual browser',
                                options: [
                                        {
                                                name: 'url',
                                                description: 'The url you want to go to',
                                                type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
                                                required: false,
                                        },
                                ],
                        },
                        {
                                name: 'presets',
                                description: 'Quick access to popular websites'
                        },
                        {
                                name: 'ping',
                                description: 'Check bot latency and status'
                        },
                        {
                                name: 'settings',
                                description: 'Configure your browsing preferences'
                        },
                        {
                                name: 'forceclear',
                                description: 'Force end maintenance mode for a browser session (Admin only)'
                        }
                ]).then(async () => {
                        console.log(chalk.green('✓ Global commands registered'));

                        // Clear any old guild-specific commands to prevent duplicates
                        for (const guild of bot.guilds.values()) {
                                try {
                                        await bot.bulkEditGuildCommands(guild.id, []);
                                } catch (e) {
                                        // Ignore errors for guilds where we can't manage commands
                                }
                        }
                        console.log(chalk.green('✓ Cleared guild-specific commands'));
                        console.log(chalk.green.bold('🚀 Bot ready!\n'));
                }).catch(err => {
                        console.log(chalk.red('✗ Failed to register slash commands'));
                        console.log(chalk.yellow('⚠️  Make sure the bot has "applications.commands" scope'));
                        console.log(chalk.dim('   Error:'), err.message);
                });
        });

        bot.on('messageCreate', async (msg) => {
                // eslint-disable-next-line no-shadow
                const found = data.find((x) => x.id == msg.author.id);

                if (found !== undefined) {
                        const foundIndex = data.findIndex((x) => x.id == msg.author.id);
                        if (foundIndex > -1) data.splice(foundIndex, 1);

                        const NSFW_OR_NOT = await sussySearch(msg.content);

                        if (NSFW_OR_NOT === true) {
                                console.log(chalk.red('⚠️  Blocked inappropriate text input from'), chalk.yellow(msg.author.username));
                                return msg.channel.createMessage({
                                        content: '🚫 **Text Blocked**\n\n' +
                                                '**What happened:**\n' +
                                                'Your text contains words or patterns that are blacklisted.\n\n' +
                                                '**What to do:**\n' +
                                                'Please rephrase your text without using blocked keywords.',
                                        messageReference: { messageID: msg.id },
                                        embeds: [{
                                                image: { url: 'attachment://blocked.png' },
                                                color: 0xFF0000
                                        }]
                                }, { name: 'blocked.png', file: responseBuffer });
                        }

                        await page.keyboard.type(msg.content, { delay: 0 });
                        console.log(chalk.blue('⌨️  Typed text:'), chalk.dim(msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')));

                        await msg.addReaction('✅');
                }
        });
        bot.on('interactionCreate', async (int) => {
                if (int instanceof Eris.CommandInteraction) {

                        const commandName = int.data.name; // Access command name from int.data.name (Eris)

                        if (commandName === 'forceclear') {
                                if (!int.member.permissions.has('administrator')) {
                                        return int.createMessage({
                                                content: '❌ You need administrator permissions to use this command.',
                                                flags: 64
                                        });
                                }

                                await int.acknowledge(64);

                                try {
                                        await BrowserAdapter.forceEndMaintenance(int.guildID, db); 
                                        await int.createFollowup({
                                                content: '✅ Maintenance mode has been force cleared. The browser is now available.',
                                                flags: 64
                                        });
                                } catch (error) {
                                        console.error('Error force clearing maintenance:', error);
                                        await int.createFollowup({
                                                content: '❌ Failed to force clear maintenance mode. Please try again.',
                                                flags: 64
                                        });
                                }
                                return;
                        }

                        if (commandName === 'browse') { // Use commandName here
                                // Rate limiting check
                                if (!checkRateLimit(int.member.id, userRateLimits, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)) {
                                        return int.createMessage({
                                                content: '⚠️ **Rate Limit Exceeded**\n\nYou\'re sending commands too quickly. Please wait a moment and try again.',
                                                flags: 64
                                        });
                                }

                                await int.acknowledge();

                                console.log(chalk.blue('👤 Browse command from:'), chalk.yellow(int.member.user.username), chalk.dim(`in guild ${int.guildID}`));

                                const guildId = int.guildID;
                                let session = guildSessions.get(guildId);
                                if (!session) {
                                    session = new SessionData();
                                    guildSessions.set(guildId, session);
                                }

                                // Check maintenance mode from database
                                try {
                                        const maintenanceSetting = await db('guild_settings')
                                                .where({ guild_id: guildId, setting_key: 'maintenanceMode' })
                                                .first();

                                        const isMaintenanceMode = maintenanceSetting 
                                                ? JSON.parse(maintenanceSetting.setting_value) 
                                                : false;

                                        if (isMaintenanceMode) {
                                                return int.createFollowup({
                                                        embeds: [{
                                                                title: '🔧 Maintenance Mode',
                                                                description: 'The browser is currently in maintenance mode. Please try again later.',
                                                                color: 0xFFA500,
                                                                footer: { text: 'Contact an administrator for more information' }
                                                        }],
                                                        flags: 64
                                                });
                                        }
                                } catch (error) {
                                        console.error(chalk.red('Error checking maintenance mode:'), error);
                                }

                                // Check if there's a stuck session and clear it
                                if (session.runningUser !== undefined) {
                                        // Clear if session date is invalid, missing, or expired
                                        const sessionExpired = !session.date || session.date <= 0 || Date.now() > session.date;
                                        if (sessionExpired) {
                                                console.log(chalk.yellow('⚠️  Clearing expired/invalid session'));
                                                session.runningUser = undefined;
                                                session.date = undefined;
                                                if (session.collector) {
                                                        session.collector.stopListening('end').catch(() => {});
                                                        session.collector = null;
                                                }
                                        }
                                }

                                if (session.runningUser !== undefined) {
                                        console.log(chalk.yellow('⚠️  Browser already in use in this server, rejecting request'));
                                        return int.createFollowup({
                                                content: '⏳ **Browser Already In Use**\n\n' +
                                                        'Someone else in this server is currently using the browser. Only one person per server can use it at a time.\n\n' +
                                                        '**When can you use it:**\n' +
                                                        `The current session will end <t:${Math.floor(session.date / 1000)}:R>\n\n` +
                                                        '**Why the limit:**\n' +
                                                        'Running multiple browser instances uses a lot of resources. Please wait for the current session to finish!',
                                                flags: 64
                                        });
                                }

                                const userSettings = getUserSettings(int.member.id);
                                let selectedBrowser = userSettings.browser;
                                let urlValue = null;

                                if (int.data.options) {
                                        const urlOption = int.data.options.find(opt => opt.name === 'url');
                                        const browserOption = int.data.options.find(opt => opt.name === 'browser');

                                        if (urlOption) {
                                            urlValue = sanitizeInput(urlOption.value);
                                        }
                                        if (browserOption) selectedBrowser = browserOption.value;
                                }

                                // Validate URL if provided
                                if (urlValue) {
                                    const validation = validateURL(urlValue);
                                    if (!validation.valid) {
                                        return int.createFollowup({
                                            content: `❌ **Invalid URL**\n\n${validation.error}`,
                                            flags: 64
                                        });
                                    }
                                    urlValue = validation.url;
                                }

                                // resetProcess will handle browser switching automatically
                                let resetSuccess = await resetProcess(guildId, sussyFilter, selectedBrowser);

                                if (!resetSuccess) {
                                        console.log(chalk.red('✗ Browser initialization failed'));
                                        return int.createFollowup({
                                                content: '❌ **Browser Initialization Failed**\n\n' +
                                                        '**What happened:**\n' +
                                                        'Failed to initialize the browser. This may be due to a system resource issue.\n\n' +
                                                        '**What to do:**\n' +
                                                        '• Wait a moment and try again\n' +
                                                        '• If the problem persists, please contact an administrator',
                                                flags: 64 // Ephemeral message
                                        });
                                }

                                // Sync session variables to global variables for compatibility
                                syncSessionToGlobals(session);

                                if (urlValue) {
                                        console.log(chalk.cyan('🌐 URL provided:'), chalk.dim(urlValue));

                                        // Auto-add https:// if missing
                                        if (!/^https?:\/\//i.test(urlValue)) {
                                                urlValue = 'https://' + urlValue;
                                                console.log(chalk.yellow('  → Auto-added https://'), chalk.dim(urlValue));
                                        }

                                        // Validate URL format
                                        const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
                                        if (!urlRegex.test(urlValue)) {
                                                console.log(chalk.red('✗ Invalid URL format'));
                                                return int.createFollowup({
                                                        content: '❌ **Invalid URL**\n\n' +
                                                                '**What went wrong:**\n' +
                                                                `The URL \`${int.data.options?.[0]?.value}\` is not in a valid format.\n\n` +
                                                                '**How to fix it:**\n' +
                                                                '• Make sure your URL has a domain (e.g., `google.com`, `example.com`)\n' +
                                                                '• You can include or omit `https://` - I\'ll add it automatically\n' +
                                                                '• Avoid spaces and special characters\n\n' +
                                                                '**Examples of valid URLs:**\n' +
                                                                '✅ `google.com`\n' +
                                                                '✅ `https://youtube.com`\n' +
                                                                '✅ `www.example.com/page`',
                                                        flags: 64 // Ephemeral message
                                                });
                                        }

                                        const NSFW_OR_NOT = await sussySearch(urlValue);

                                        if (NSFW_OR_NOT === true) {
                                                console.log(chalk.red('⚠️  Blocked inappropriate URL'));
                                                return int.createFollowup({
                                                        content: '⚠️ **URL Blocked**\n\nThis URL contains blacklisted content.',
                                                        flags: 64 // Ephemeral message
                                                });
                                        }

                                        await page.goto(urlValue);
                                        urlHistory.push(urlValue);
                                        console.log(chalk.green('✓ Navigated to:'), chalk.dim(urlValue));

                                        filterListener.once('redirect', async () => {
                                                if (messageID) {
                                                        try {
                                                                await bot.deleteMessage(int.channel.id, messageID.id);
                                                        } catch (e) {
                                                                console.log(chalk.yellow('⚠️  Could not delete message'));
                                                        }
                                                        messageID = false;
                                                }
                                                if (collector) collector?.stopListening('end').catch(() => {});

                                                await int.channel.createMessage({
                                                        content: `🚫 <@${runningUser}> **Session Terminated**\n\n` +
                                                                '**What happened:**\n' +
                                                                'The website you were browsing tried to redirect to a blacklisted URL.\n\n' +
                                                                '**Common triggers:**\n' +
                                                                '• Login pages with suspicious parameters\n' +
                                                                '• URLs containing blocked keywords\n' +
                                                                '• Redirects to local addresses\n\n' +
                                                                '**What to do:**\n' +
                                                                'Use `/browse` again with a different website that doesn\'t require authentication or contain blocked content.',
                                                        embeds: [{
                                                                image: { url: 'attachment://blocked.png' },
                                                                color: 0xFF6B00
                                                        }]
                                                }, { name: 'blocked.png', file: responseBuffer });

                                                const resetSuccess = await resetProcess(guildId, sussyFilter, currentBrowserType); // Pass guildId and currentBrowserType
                                                if (resetSuccess) {
                                                        const updatedSession = guildSessions.get(guildId);
                                                        syncSessionToGlobals(updatedSession);
                                                } else {
                                                        console.log(chalk.yellow('⚠️  Failed to reset browser after redirect block'));
                                                }
                                        });
                                }

                                try {
                                        runningUser = int.member.id;
                                        session.runningUser = int.member.id;
                                        console.log(chalk.green('🎮 Session started for:'), chalk.yellow(int.member.user.username));

                                        const userTimeout = getUserSettings(int.member.id).sessionTimeout || clearTime;
                                        date = Date.now() + userTimeout;
                                        session.date = date;
                                        const minutes = Math.floor(userTimeout / 60000);
                                        console.log(chalk.dim(`   Session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}...`));

                                        setTimeout(async () => {
                                                console.log(chalk.yellow('⏱️  Session timeout - closing browser session'));
                                                const userAutoClose = getUserSettings(int.member.id).autoCloseBrowser;
                                                if (userAutoClose !== false) {
                                                        const resetSuccess = await resetProcess(guildId, sussyFilter, currentBrowserType); // Pass guildId and currentBrowserType
                                                        if (resetSuccess) {
                                                                const updatedSession = guildSessions.get(guildId);
                                                                syncSessionToGlobals(updatedSession);
                                                        } else {
                                                                console.log(chalk.yellow('⚠️  Failed to reset browser after timeout'));
                                                        }
                                                }
                                        }, userTimeout);

                                        const screenshotQuality = getUserSettings(int.member.id).screenshotQuality || 80;
                                        const image = await page.screenshot({ 
                                                type: screenshotQuality < 100 ? 'jpeg' : 'png',
                                                quality: screenshotQuality < 100 ? screenshotQuality : undefined
                                        });
                                        const ids = [];

                                        for (let i = 0; i < 16; i++) {
                                                ids.push(String(Math.random()));
                                        }

                                        const componentsArray = [
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: 'x25', custom_id: ids[0], style: 1 },
                                                                { type: 2, label: 'x50', custom_id: ids[1], style: 1 },
                                                                { type: 2, label: 'x100', custom_id: ids[2], style: 1 },
                                                        ],
                                                },
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: '◀ Back', custom_id: ids[3], style: 2 },
                                                                { type: 2, label: 'Forward ▶', custom_id: ids[4], style: 2 },
                                                                { type: 2, label: '🔄 Reset', custom_id: ids[5], style: 4 },
                                                                { type: 2, label: '📜 History', custom_id: ids[6], style: 1 },
                                                        ],
                                                },
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: '← Left', custom_id: ids[7], style: 3 },
                                                                { type: 2, label: '↑ Up', custom_id: ids[8], style: 3 },
                                                                { type: 2, label: '🖱️ Click', custom_id: ids[9], style: 2 },
                                                                { type: 2, label: '↓ Down', custom_id: ids[10], style: 3 },
                                                                { type: 2, label: '→ Right', custom_id: ids[11], style: 3 },
                                                        ],
                                                },
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: '⌨️ Type', custom_id: ids[12], style: 2 },
                                                                { type: 2, label: '↵ Enter', custom_id: ids[13], style: 2 },
                                                                { type: 2, label: '⬆ Scroll', custom_id: ids[14], style: 1 },
                                                                { type: 2, label: '⬇ Scroll', custom_id: ids[15], style: 1 },
                                                        ],
                                                },
                                        ];
                                        const messageObject = {
                                                content: '\u200b',
                                                components: componentsArray,
                                                embeds: [{
                                                        image: { url: 'attachment://file.png' },
                                                        color: 0x00BFFF,
                                                        footer: {
                                                                text: `Discordmium ${BOT_VERSION} • Chromie`
                                                        }
                                                }],
                                                attachments: [],
                                        };

                                        messageID = await int.createFollowup(messageObject, { name: 'file.png', file: image });
                                        session.messageID = messageID; // Store messageID in session

                                        if (userSettings.performanceMode) {
                                                await startPerformanceMode(bot, int.member.id, userSettings.updateInterval);
                                        }

                                        collector = await collectInteractions({
                                                client: bot,
                                                componentType: 2,
                                                filter: (_) => true, // Allow all interactions to be collected
                                        });

                                        collector.on('collect', async interaction => {
                                                // Check if the person clicking is the session owner
                                                if (interaction.member.id !== int.member.id) {
                                                        console.log(chalk.yellow('⚠️  Unauthorized control attempt by:'), chalk.dim(interaction.member.user.username));
                                                        return interaction.createMessage({
                                                                content: '🚫 **Access Denied**\n\nYou cannot control this browser session. Only the person who started it can interact with the controls.',
                                                                flags: 64 // Ephemeral message
                                                        });
                                                }

                                                await interaction.acknowledge();

                                                if (!ids.includes(interaction.data.custom_id)) return;

                                                const actionIndex = ids.indexOf(interaction.data.custom_id);

                                                /** MOUSE SENSITIVITY | ROW 1 */
                                                switch (interaction.data.custom_id) {

                                                case ids[0]:
                                                        mouseModifier = 25;
                                                        console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x25'));
                                                        break;
                                                case ids[1]:
                                                        mouseModifier = 50;
                                                        console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x50'));
                                                        break;
                                                case ids[2]:
                                                        mouseModifier = 100;
                                                        console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x100'));
                                                        break;

                                                        /**NAVIGATION | ROW 2 */
                                                case ids[3]:
                                                        try {
                                                                await page.goBack();
                                                                console.log(chalk.blue('◀️  Navigation:'), chalk.dim('Back'));
                                                        } catch (e) {
                                                                console.log(chalk.yellow('⚠️  Cannot go back'));
                                                        }
                                                        break;
                                                case ids[4]:
                                                        try {
                                                                await page.goForward();
                                                                console.log(chalk.blue('▶️  Navigation:'), chalk.dim('Forward'));
                                                        } catch (e) {
                                                                console.log(chalk.yellow('⚠️  Cannot go forward'));
                                                        }
                                                        break;
                                                case ids[5]:
                                                        console.log(chalk.yellow('🔄 Resetting page...'));
                                                        {
                                                                const browseSession = guildSessions.get(guildId);
                                                                if (page) {
                                                                        await page.close();
                                                                }
                                                                page = await browser.newPage();
                                                                if (browseSession) {
                                                                        browseSession.page = page;
                                                                        browseSession.urlHistory.length = 0;
                                                                }
                                                                urlHistory.length = 0;

                                                                await page.setViewport({
                                                                        width: 1920,
                                                                        height: 1080,
                                                                });

                                                                await plugin(page);
                                                                await page.goto('https://google.com');

                                                                await page.mouse.move(x, y);
                                                        }
                                                        break;
                                                case ids[6]:
                                                        if (urlHistory.length === 0) {
                                                                await bot.createMessage(interaction.channel.id, {
                                                                        content: '📜 **History is empty**\n\nNo URLs have been visited yet in this session.',
                                                                        messageReference: { messageID: messageID.id }
                                                                });
                                                        } else {
                                                                const historyList = urlHistory.slice(-10).reverse().map((url, i) => `${i + 1}. ${url}`).join('\n');
                                                                await bot.createMessage(interaction.channel.id, {
                                                                        embeds: [{
                                                                                title: '📜 Browsing History',
                                                                                description: historyList,
                                                                                color: 0x00BFFF,
                                                                                footer: { text: `Last 10 URLs • ${BOT_VERSION}` }
                                                                        }],
                                                                        messageReference: { messageID: messageID.id }
                                                                });
                                                        }
                                                        console.log(chalk.blue('📜 History requested by:'), chalk.yellow(interaction.member.user.username));
                                                        break;

                                                        /** MOVEMENT | ROW 3 */
                                                case ids[7]:
                                                        await move('left');
                                                        console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('← Left'));
                                                        break;
                                                case ids[8]:
                                                        await move('up');
                                                        console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('↑ Up'));
                                                        break;
                                                case ids[9]:
                                                        await move('click');
                                                        console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('Click'));
                                                        break;
                                                case ids[10]:
                                                        await move('down');
                                                        console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('↓ Down'));
                                                        break;
                                                case ids[11]:
                                                        await move('right');
                                                        console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('→ Right'));
                                                        break;

                                                        /** ACTIONS | ROW 4 */
                                                case ids[12]:
                                                        await bot.createMessage(interaction.channel.id, {
                                                                content: '⌨️ **Type Mode Activated**\n\nPlease type your message in the next message, and it will be typed in the browser.',
                                                                messageReference: { messageID: messageID.id }
                                                        });
                                                        data.push({ id: interaction.member.id });
                                                        console.log(chalk.blue('⌨️  Awaiting text input from:'), chalk.yellow(interaction.member.user.username));
                                                        break;
                                                case ids[13]:
                                                        await page.keyboard.press('Enter');
                                                        console.log(chalk.blue('⌨️  Pressed:'), chalk.dim('Enter'));
                                                        break;
                                                case ids[14]:
                                                        await page.evaluate(() => window.scrollBy(0, -500));
                                                        console.log(chalk.blue('📜 Scroll:'), chalk.dim('⬆ Up 500px'));
                                                        break;
                                                case ids[15]:
                                                        await page.evaluate(() => window.scrollBy(0, 500));
                                                        console.log(chalk.blue('📜 Scroll:'), chalk.dim('⬇ Down 500px'));
                                                        break;

                                                }
                                                update(int, messageObject);
                                        });
                                }
                                catch (e) {
                                        /** AVOID LOGGING ERRORS THAT ARE KNOWN */
                                        if (!e.message.includes('Target closed.')) {
                                                console.log(chalk.red('✗ Error occurred:'), chalk.dim(e.message));
                                        }
                                }
                        }

                        if (commandName === 'ping') {
                                const startTime = Date.now();
                                await int.acknowledge();
                                const latency = Date.now() - startTime;

                                console.log(chalk.blue('🏓 Ping command from:'), chalk.yellow(int.member.user.username));
                                console.log(chalk.cyan('  Latency:'), chalk.yellow(`${latency}ms`));

                                const uptime = process.uptime();
                                const hours = Math.floor(uptime / 3600);
                                const minutes = Math.floor((uptime % 3600) / 60);
                                const seconds = Math.floor(uptime % 60);

                                let uptimeString = '';
                                if (hours > 0) uptimeString += `${hours}h `;
                                if (minutes > 0) uptimeString += `${minutes}m `;
                                uptimeString += `${seconds}s`;

                                const browserStatus = browser && browser.isConnected() ? '🟢 Connected' : '🔴 Disconnected';
                                const sessionStatus = runningUser ? `🟡 In use by <@${runningUser}>` : '🟢 Available';

                                await int.createFollowup({
                                        embeds: [{
                                                title: '🏓 Pong!',
                                                color: 0x00FF00,
                                                fields: [
                                                        {
                                                                name: '⏱️ Response Time',
                                                                value: `\`${latency}ms\``,
                                                                inline: true
                                                        },
                                                        {
                                                                name: '📡 Websocket Latency',
                                                                value: `\`${bot.shards.get(0).latency}ms\``,
                                                                inline: true
                                                        },
                                                        {
                                                                name: '⏰ Uptime',
                                                                value: `\`${uptimeString}\``,
                                                                inline: true
                                                        },
                                                        {
                                                                name: '🌐 Browser Status',
                                                                value: browserStatus,
                                                                inline: true
                                                        },
                                                        {
                                                                name: '🎮 Session Status',
                                                                value: sessionStatus,
                                                                inline: true
                                                        },
                                                        {
                                                                name: '💾 Memory Usage',
                                                                value: `\`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\``,
                                                                inline: true
                                                        }
                                                ],
                                                timestamp: new Date(),
                                                footer: {
                                                        text: `Requested by ${int.member.user.username}`
                                                }
                                        }]
                                });
                        }

                        if (commandName === 'presets') {
                                await int.acknowledge();

                                console.log(chalk.blue('🌐 Presets command from:'), chalk.yellow(int.member.user.username));

                                const presetIds = [];
                                for (let i = 0; i < 10; i++) {
                                        presetIds.push(String(Math.random()));
                                }

                                await int.createFollowup({
                                        embeds: [{
                                                title: '🌐 Quick Access - Popular Websites',
                                                description: 'Click a button below to browse that website instantly!',
                                                color: 0x00BFFF,
                                                footer: { text: 'Select a website to visit' }
                                        }],
                                        components: [
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: '🔍 Google', custom_id: presetIds[0], style: 1 },
                                                                { type: 2, label: '▶️ YouTube', custom_id: presetIds[1], style: 4 },
                                                                { type: 2, label: '🐙 GitHub', custom_id: presetIds[2], style: 2 },
                                                                { type: 2, label: '🐦 Twitter', custom_id: presetIds[3], style: 1 },
                                                                { type: 2, label: '📰 Reddit', custom_id: presetIds[4], style: 4 },
                                                        ]
                                                },
                                                {
                                                        type: 1,
                                                        components: [
                                                                { type: 2, label: '📚 Wikipedia', custom_id: presetIds[5], style: 2 },
                                                                { type: 2, label: '💬 Discord', custom_id: presetIds[6], style: 1 },
                                                                { type: 2, label: '📦 Stack Overflow', custom_id: presetIds[7], style: 3 },
                                                                { type: 2, label: '🛒 Amazon', custom_id: presetIds[8], style: 3 },
                                                                { type: 2, label: '🎮 Twitch', custom_id: presetIds[9], style: 1 },
                                                        ]
                                                }
                                        ]
                                });

                                const presetCollector = await collectInteractions({
                                        client: bot,
                                        componentType: 2,
                                        filter: (_) => _.member.id === int.member.id && presetIds.includes(_.data.custom_id),
                                        time: 60000
                                });

                                presetCollector.on('collect', async presetInt => {
                                        await presetInt.acknowledge();

                                        const websites = {
                                                [presetIds[0]]: { url: 'https://google.com', name: 'Google' },
                                                [presetIds[1]]: { url: 'https://youtube.com', name: 'YouTube' },
                                                [presetIds[2]]: { url: 'https://github.com', name: 'GitHub' },
                                                [presetIds[3]]: { url: 'https://twitter.com', name: 'Twitter' },
                                                [presetIds[4]]: { url: 'https://reddit.com', name: 'Reddit' },
                                                [presetIds[5]]: { url: 'https://wikipedia.org', name: 'Wikipedia' },
                                                [presetIds[6]]: { url: 'https://discord.com', name: 'Discord' },
                                                [presetIds[7]]: { url: 'https://stackoverflow.com', name: 'Stack Overflow' },
                                                [presetIds[8]]: { url: 'https://amazon.com', name: 'Amazon' },
                                                [presetIds[9]]: { url: 'https://twitch.tv', name: 'Twitch' }
                                        };

                                        const selected = websites[presetInt.data.custom_id];

                                        // Ensure session is available and has necessary properties
                                        let session = guildSessions.get(int.guildID);
                                        if (!session) {
                                            session = new SessionData();
                                            guildSessions.set(int.guildID, session);
                                        }
                                        session.runningUser = presetInt.member.id; // Set running user

                                        if (runningUser !== undefined && runningUser !== presetInt.member.id) {
                                                return presetInt.createFollowup({
                                                        content: '⏳ **Browser Already In Use**\n\n' +
                                                                'Someone else is currently using the browser. Please wait for the current session to finish!',
                                                        flags: 64
                                                });
                                        }
                                        
                                        // Reset the process to ensure a clean state
                                        const resetSuccess = await resetProcess(int.guildID, sussyFilter, userSettings.browser);
                                        if (!resetSuccess) {
                                                console.log(chalk.red('✗ Browser reset failed for preset'));
                                                return presetInt.createFollowup({
                                                        content: '❌ **Browser Reset Failed**\n\nCould not reset the browser for the preset. Please try again later.',
                                                        flags: 64
                                                });
                                        }
                                        syncSessionToGlobals(session); // Sync after reset

                                        console.log(chalk.green(`🌐 Opening preset: ${selected.name}`));

                                        const presetUserSettings = getUserSettings(presetInt.member.id);

                                        try {
                                                runningUser = presetInt.member.id;
                                                const presetTimeout = presetUserSettings.sessionTimeout || clearTime;
                                                date = Date.now() + presetTimeout;
                                                session.date = date; // Update session date

                                                setTimeout(async () => {
                                                        console.log(chalk.yellow('⏱️  Session timeout - closing browser session'));
                                                        const userAutoClose = presetUserSettings.autoCloseBrowser;
                                                        if (userAutoClose !== false) {
                                                                const resetSuccess = await resetProcess(int.guildID, sussyFilter, currentBrowserType); // Pass guildId and currentBrowserType
                                                                if (resetSuccess) {
                                                                        const updatedSession = guildSessions.get(int.guildID);
                                                                        syncSessionToGlobals(updatedSession);
                                                                } else {
                                                                        console.log(chalk.yellow('⚠️  Failed to reset browser after timeout'));
                                                                }
                                                        }
                                                }, presetTimeout);

                                                await page.goto(selected.url);
                                                urlHistory.push(selected.url);
                                                session.urlHistory.push(selected.url); // Update session history
                                                console.log(chalk.green('✓ Navigated to:'), chalk.dim(selected.url));

                                                const presetScreenshotQuality = presetUserSettings.screenshotQuality || 80;
                                                const image = await page.screenshot({
                                                        type: presetScreenshotQuality < 100 ? 'jpeg' : 'png',
                                                        quality: presetScreenshotQuality < 100 ? presetScreenshotQuality : undefined
                                                });
                                                const ids = [];

                                                for (let i = 0; i < 16; i++) {
                                                        ids.push(String(Math.random()));
                                                }

                                                const componentsArray = [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: 'x25', custom_id: ids[0], style: 1 },
                                                                        { type: 2, label: 'x50', custom_id: ids[1], style: 1 },
                                                                        { type: 2, label: 'x100', custom_id: ids[2], style: 1 },
                                                                ],
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '◀ Back', custom_id: ids[3], style: 2 },
                                                                        { type: 2, label: 'Forward ▶', custom_id: ids[4], style: 2 },
                                                                        { type: 2, label: '🔄 Reset', custom_id: ids[5], style: 4 },
                                                                        { type: 2, label: '📜 History', custom_id: ids[6], style: 1 },
                                                                ],
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '← Left', custom_id: ids[7], style: 3 },
                                                                        { type: 2, label: '↑ Up', custom_id: ids[8], style: 3 },
                                                                        { type: 2, label: '🖱️ Click', custom_id: ids[9], style: 2 },
                                                                        { type: 2, label: '↓ Down', custom_id: ids[10], style: 3 },
                                                                        { type: 2, label: '→ Right', custom_id: ids[11], style: 3 },
                                                                ],
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '⌨️ Type', custom_id: ids[12], style: 2 },
                                                                        { type: 2, label: '↵ Enter', custom_id: ids[13], style: 2 },
                                                                        { type: 2, label: '⬆ Scroll', custom_id: ids[14], style: 1 },
                                                                        { type: 2, label: '⬇ Scroll', custom_id: ids[15], style: 1 },
                                                                ],
                                                        },
                                                ];

                                                const messageObject = {
                                                        content: '\u200b',
                                                        components: componentsArray,
                                                        embeds: [{
                                                                image: { url: 'attachment://file.png' },
                                                                color: 0x00BFFF,
                                                                footer: {
                                                                        text: `Discordmium ${BOT_VERSION} • Chromie`
                                                                }
                                                        }],
                                                        attachments: [],
                                                };

                                                messageID = await presetInt.createFollowup(messageObject, { name: 'file.png', file: image });
                                                session.messageID = messageID; // Store messageID in session

                                                if (presetUserSettings.performanceMode) {
                                                        await startPerformanceMode(bot, presetInt.member.id, presetUserSettings.updateInterval);
                                                }

                                                collector = await collectInteractions({
                                                        client: bot,
                                                        componentType: 2,
                                                        filter: (_) => true, // Allow all interactions to be collected
                                                });

                                                collector.on('collect', async interaction => {
                                                        // Check if the person clicking is the session owner
                                                        if (interaction.member.id !== presetInt.member.id) {
                                                                console.log(chalk.yellow('⚠️  Unauthorized control attempt by:'), chalk.dim(interaction.member.user.username));
                                                                return interaction.createMessage({
                                                                        content: '🚫 **Access Denied**\n\nYou cannot control this browser session. Only the person who started it can interact with the controls.',
                                                                        flags: 64 // Ephemeral message
                                                                });
                                                        }

                                                        await interaction.acknowledge();

                                                        if (!ids.includes(interaction.data.custom_id)) return;

                                                        /** MOUSE SENSITIVITY | ROW 1 */
                                                        switch (interaction.data.custom_id) {

                                                        case ids[0]:
                                                                mouseModifier = 25;
                                                                console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x25'));
                                                                break;
                                                        case ids[1]:
                                                                mouseModifier = 50;
                                                                console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x50'));
                                                                break;
                                                        case ids[2]:
                                                                mouseModifier = 100;
                                                                console.log(chalk.blue('🎯 Mouse sensitivity:'), chalk.yellow('x100'));
                                                                break;

                                                                /**NAVIGATION | ROW 2 */
                                                        case ids[3]:
                                                                try {
                                                                        await page.goBack();
                                                                        console.log(chalk.blue('◀️  Navigation:'), chalk.dim('Back'));
                                                                } catch (e) {
                                                                        console.log(chalk.yellow('⚠️  Cannot go back'));
                                                                }
                                                                break;
                                                        case ids[4]:
                                                                try {
                                                                        await page.goForward();
                                                                        console.log(chalk.blue('▶️  Navigation:'), chalk.dim('Forward'));
                                                                } catch (e) {
                                                                        console.log(chalk.yellow('⚠️  Cannot go forward'));
                                                                }
                                                                break;
                                                        case ids[5]:
                                                                console.log(chalk.yellow('🔄 Resetting page...'));
                                                                {
                                                                        const presetSession = guildSessions.get(int.guildID);
                                                                        if (page) {
                                                                                await page.close();
                                                                        }
                                                                        page = await browser.newPage();
                                                                        if (presetSession) presetSession.page = page;

                                                                        await page.setViewport({
                                                                                width: 1920,
                                                                                height: 1080,
                                                                        });

                                                                        await plugin(page);
                                                                        // Set up anti-bot notification callback
                                                                        session.page._antiBotNotificationCallback = async (pattern, alternative) => {
                                                                                try {
                                                                                        const detectedSite = pattern.includes('google') ? 'Google' : 
                                                                                                            pattern.includes('bing') ? 'Bing' :
                                                                                                            pattern.includes('yahoo') ? 'Yahoo' : 'the website';

                                                                                        await bot.createMessage(messageID.channel.id, {
                                                                                                embeds: [{
                                                                                                        title: '🛡️ Discordmium Stealth Protection',
                                                                                                        description: `**Anti-bot page detected and bypassed!**\n\n` +
                                                                                                                   `${detectedSite} tried to show you a captcha/verification page, but Discordmium Stealth automatically protected you and redirected to a safer alternative.\n\n` +
                                                                                                                   `**What happened:**\n` +
                                                                                                                   `• Detected: \`${pattern}\`\n` +
                                                                                                                   `• Redirected to: ${alternative}\n\n` +
                                                                                                                   `You can continue browsing normally! 🚀`,
                                                                                                        color: 0x00FF00,
                                                                                                        footer: {
                                                                                                                text: 'Powered by Puppeteer Stealth'
                                                                                                        },
                                                                                                        timestamp: new Date()
                                                                                                }],
                                                                                                components: [{
                                                                                                        type: 1,
                                                                                                        components: [{
                                                                                                                type: 2,
                                                                                                                label: 'Dismiss',
                                                                                                                custom_id: `dismiss_${Date.now()}`,
                                                                                                                style: 2,
                                                                                                                emoji: { name: '✅' }
                                                                                                        }]
                                                                                                }]
                                                                                        });
                                                                                } catch (e) {
                                                                                        console.log(chalk.yellow('⚠️  Could not send anti-bot notification:'), e.message);
                                                                                }
                                                                        };

                                                                        await session.page.goto('https://google.com');
                                                                        urlHistory.length = 0;
                                                                        if (presetSession) presetSession.urlHistory = urlHistory;

                                                                        await page.mouse.move(x, y);
                                                                }
                                                                break;
                                                        case ids[6]:
                                                                if (urlHistory.length === 0) {
                                                                        await bot.createMessage(interaction.channel.id, {
                                                                                content: '📜 **History is empty**\n\nNo URLs have been visited yet in this session.',
                                                                                messageReference: { messageID: messageID.id }
                                                                        });
                                                                } else {
                                                                        const historyList = urlHistory.slice(-10).reverse().map((url, i) => `${i + 1}. ${url}`).join('\n');
                                                                        await bot.createMessage(interaction.channel.id, {
                                                                                embeds: [{
                                                                                        title: '📜 Browsing History',
                                                                                        description: historyList,
                                                                                        color: 0x00BFFF,
                                                                                        footer: { text: `Last 10 URLs • ${BOT_VERSION}` }
                                                                                }],
                                                                                messageReference: { messageID: messageID.id }
                                                                        });
                                                                }
                                                                console.log(chalk.blue('📜 History requested by:'), chalk.yellow(interaction.member.user.username));
                                                                break;

                                                                /** MOVEMENT | ROW 3 */
                                                        case ids[7]:
                                                                await move('left');
                                                                console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('← Left'));
                                                                break;
                                                        case ids[8]:
                                                                await move('up');
                                                                console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('↑ Up'));
                                                                break;
                                                        case ids[9]:
                                                                await move('click');
                                                                console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('Click'));
                                                                break;
                                                        case ids[10]:
                                                                await move('down');
                                                                console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('↓ Down'));
                                                                break;
                                                        case ids[11]:
                                                                await move('right');
                                                                console.log(chalk.blue('🖱️  Mouse:'), chalk.dim('→ Right'));
                                                                break;

                                                                /** ACTIONS | ROW 4 */
                                                        case ids[12]:
                                                                await bot.createMessage(interaction.channel.id, {
                                                                        content: '⌨️ **Type Mode Activated**\n\nPlease type your message in the next message, and it will be typed in the browser.',
                                                                        messageReference: { messageID: messageID.id }
                                                                });
                                                                data.push({ id: interaction.member.id });
                                                                console.log(chalk.blue('⌨️  Awaiting text input from:'), chalk.yellow(interaction.member.user.username));
                                                                break;
                                                        case ids[13]:
                                                                await page.keyboard.press('Enter');
                                                                console.log(chalk.blue('⌨️  Pressed:'), chalk.dim('Enter'));
                                                                break;
                                                        case ids[14]:
                                                                await page.evaluate(() => window.scrollBy(0, -500));
                                                                console.log(chalk.blue('📜 Scroll:'), chalk.dim('⬆ Up 500px'));
                                                                break;
                                                        case ids[15]:
                                                                await page.evaluate(() => window.scrollBy(0, 500));
                                                                console.log(chalk.blue('📜 Scroll:'), chalk.dim('⬇ Down 500px'));
                                                                break;

                                                        }
                                                        update(interaction, messageObject);
                                                });
                                        } catch (e) {
                                                if (!e.message.includes('Target closed.')) {
                                                        console.log(chalk.red('✗ Error occurred:'), chalk.dim(e.message));
                                                }
                                        }
                                });
                        }

                        if (commandName === 'settings') {
                                await int.acknowledge();

                                console.log(chalk.blue('⚙️  Settings command from:'), chalk.yellow(int.member.user.username));

                                const userSettings = getUserSettings(int.member.id);
                                const settingsIds = {
                                        performance: String(Math.random()),
                                        browserSettings: String(Math.random()),
                                        sessionSettings: String(Math.random()),
                                        browserChoice: String(Math.random()),
                                        perfToggle: String(Math.random()),
                                        interval2s: String(Math.random()),
                                        interval5s: String(Math.random()),
                                        interval10s: String(Math.random()),
                                        browserChrome: String(Math.random()),
                                        darkModeToggle: String(Math.random()),
                                        adBlockToggle: String(Math.random()),
                                        timeout3min: String(Math.random()),
                                        timeout5min: String(Math.random()),
                                        timeout10min: String(Math.random()),
                                        quality60: String(Math.random()),
                                        quality80: String(Math.random()),
                                        quality100: String(Math.random()),
                                        autoCloseToggle: String(Math.random()),
                                        back: String(Math.random())
                                };

                                async function showMainMenu(interaction) {
                                        const perfIcon = userSettings.performanceMode ? '⚡' : '💤';

                                        await interaction.editOriginalMessage({
                                                embeds: [{
                                                        title: '⚙️ Settings',
                                                        description: 'Configure your browsing preferences',
                                                        color: 0x7289DA,
                                                        fields: [
                                                                {
                                                                        name: '⚡ Performance Mode',
                                                                        value: userSettings.performanceMode ? 
                                                                                `✅ Enabled (${userSettings.updateInterval / 1000}s interval)` : 
                                                                                '❌ Disabled',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: '🌐 Browser Settings',
                                                                        value: `Browser: 🌐 Chrome\n` +
                                                                               `Dark Mode: ${userSettings.darkMode ? '✅ Enabled' : '❌ Disabled'}\n` +
                                                                               `Ad Block: ${userSettings.adBlock !== false ? '✅ Enabled' : '❌ Disabled'}`,
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: '🕐 Session Settings',
                                                                        value: `Timeout: ${userSettings.sessionTimeout / 60000} min\n` +
                                                                               `Screenshot Quality: ${userSettings.screenshotQuality}%\n` +
                                                                               `Auto-Close: ${userSettings.autoCloseBrowser ? '✅ Enabled' : '❌ Disabled'}`,
                                                                        inline: false
                                                                }
                                                        ],
                                                        footer: { text: 'Select a category to configure' }
                                                }],
                                                components: [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: `${perfIcon} Performance`, custom_id: settingsIds.performance, style: 1 },
                                                                        { type: 2, label: '🌐 Browser', custom_id: settingsIds.browserSettings, style: 2 },
                                                                        { type: 2, label: '🕐 Session', custom_id: settingsIds.sessionSettings, style: 2 }
                                                                ]
                                                        }
                                                ]
                                        });
                                }

                                async function showPerformanceMenu(interaction) {
                                        const currentSettings = getUserSettings(int.member.id);
                                        const isEnabled = currentSettings.performanceMode;
                                        const interval = currentSettings.updateInterval;

                                        await interaction.editOriginalMessage({
                                                embeds: [{
                                                        title: '⚡ Performance Settings',
                                                        description: 'Configure automatic screenshot updates during browsing sessions',
                                                        color: 0xFFAA00,
                                                        fields: [
                                                                {
                                                                        name: 'Current Status',
                                                                        value: isEnabled ? '✅ Performance Mode Enabled' : '❌ Performance Mode Disabled',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'Update Interval',
                                                                        value: `${interval / 1000} seconds`,
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ What is Performance Mode?',
                                                                        value: 'When enabled, the browser screenshot will automatically refresh every few seconds during active sessions, giving you a live view without manual updates.',
                                                                        inline: false
                                                                }
                                                        ],
                                                        footer: { text: 'Toggle or adjust your performance settings' }
                                                }],
                                                components: [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { 
                                                                                type: 2, 
                                                                                label: isEnabled ? 'Disable Performance Mode' : 'Enable Performance Mode', 
                                                                                custom_id: settingsIds.perfToggle, 
                                                                                style: isEnabled ? 4 : 3 
                                                                        }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '2s Interval', custom_id: settingsIds.interval2s, style: interval === 2000 ? 1 : 2 },
                                                                        { type: 2, label: '5s Interval', custom_id: settingsIds.interval5s, style: interval === 5000 ? 1 : 2 },
                                                                        { type: 2, label: '10s Interval', custom_id: settingsIds.interval10s, style: interval === 10000 ? 1 : 2 }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '← Back', custom_id: settingsIds.back, style: 2 }
                                                                ]
                                                        }
                                                ]
                                        });
                                }

                                async function showBrowserSettingsMenu(interaction) {
                                        const currentSettings = getUserSettings(int.member.id);
                                        const isDarkMode = currentSettings.darkMode;
                                        const isAdBlockEnabled = currentSettings.adBlock !== false;

                                        await interaction.editOriginalMessage({
                                                embeds: [{
                                                        title: '🌐 Browser Settings',
                                                        description: 'Configure browser behavior and appearance',
                                                        color: 0x00AAFF,
                                                        fields: [
                                                                {
                                                                        name: '🌙 Dark Mode',
                                                                        value: isDarkMode ? '✅ Enabled' : '❌ Disabled',
                                                                        inline: true
                                                                },
                                                                {
                                                                        name: '🛡️ Ad Block',
                                                                        value: isAdBlockEnabled ? '✅ Enabled' : '❌ Disabled',
                                                                        inline: true
                                                                },
                                                                {
                                                                        name: '\u200b',
                                                                        value: '\u200b',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ Dark Mode',
                                                                        value: 'Websites will use their dark theme if available (uses `prefers-color-scheme`).',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ Ad Block',
                                                                        value: 'Blocks ads, trackers, and analytics from major networks like Google, Facebook, Amazon, and more.',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: '📝 Note',
                                                                        value: 'Changes apply to new browser sessions. Restart your current session to see them.',
                                                                        inline: false
                                                                }
                                                        ],
                                                        footer: { text: 'Configure browser preferences' }
                                                }],
                                                components: [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { 
                                                                                type: 2, 
                                                                                label: isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode', 
                                                                                custom_id: settingsIds.darkModeToggle, 
                                                                                style: isDarkMode ? 2 : 1
                                                                        },
                                                                        { 
                                                                                type: 2, 
                                                                                label: isAdBlockEnabled ? 'Disable Ad Block' : 'Enable Ad Block', 
                                                                                custom_id: settingsIds.adBlockToggle, 
                                                                                style: isAdBlockEnabled ? 4 : 3
                                                                        }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '🔧 Browser Choice', custom_id: settingsIds.browserChoice, style: 2 }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '← Back', custom_id: settingsIds.back, style: 2 }
                                                                ]
                                                        }
                                                ]
                                        });
                                }

                                async function showBrowserChoiceMenu(interaction) {
                                        await interaction.editOriginalMessage({
                                                embeds: [{
                                                        title: '🌐 Browser Settings',
                                                        description: 'Browser configuration',
                                                        color: 0x00AAFF,
                                                        fields: [
                                                                {
                                                                        name: 'Current Browser',
                                                                        value: '🌐 Chrome (Chromium)',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ Note',
                                                                        value: 'Chrome is the default browser engine for all browsing sessions.',
                                                                        inline: false
                                                                }
                                                        ],
                                                        footer: { text: 'Chrome provides the best compatibility' }
                                                }],
                                                components: [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { 
                                                                                type: 2, 
                                                                                label: '🌐 Chrome (Active)', 
                                                                                custom_id: settingsIds.browserChrome, 
                                                                                style: 1,
                                                                                disabled: true
                                                                        }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '← Back', custom_id: settingsIds.back, style: 2 }
                                                                ]
                                                        }
                                                ]
                                        });
                                }

                                async function showSessionSettingsMenu(interaction) {
                                        const currentSettings = getUserSettings(int.member.id);
                                        const timeout = currentSettings.sessionTimeout;
                                        const quality = currentSettings.screenshotQuality;
                                        const autoClose = currentSettings.autoCloseBrowser;

                                        await interaction.editOriginalMessage({
                                                embeds: [{
                                                        title: '🕐 Session Settings',
                                                        description: 'Configure session behavior and quality preferences',
                                                        color: 0xFF6B35,
                                                        fields: [
                                                                {
                                                                        name: '⏱️ Session Timeout',
                                                                        value: `${timeout / 60000} minutes`,
                                                                        inline: true
                                                                },
                                                                {
                                                                        name: '📸 Screenshot Quality',
                                                                        value: `${quality}%`,
                                                                        inline: true
                                                                },
                                                                {
                                                                        name: '🚪 Auto-Close Browser',
                                                                        value: autoClose ? '✅ Enabled' : '❌ Disabled',
                                                                        inline: true
                                                                },
                                                                {
                                                                        name: 'ℹ️ Session Timeout',
                                                                        value: 'Maximum time a browsing session can stay active before automatically closing.',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ Screenshot Quality',
                                                                        value: 'Higher quality screenshots look better but take longer to send. Lower quality is faster.',
                                                                        inline: false
                                                                },
                                                                {
                                                                        name: 'ℹ️ Auto-Close Browser',
                                                                        value: 'When enabled, closes the browser automatically when your session expires or you stop using it.',
                                                                        inline: false
                                                                }
                                                        ],
                                                        footer: { text: 'Adjust your session preferences' }
                                                }],
                                                components: [
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '3 min', custom_id: settingsIds.timeout3min, style: timeout === 180000 ? 1 : 2 },
                                                                        { type: 2, label: '5 min', custom_id: settingsIds.timeout5min, style: timeout === 300000 ? 1 : 2 },
                                                                        { type: 2, label: '10 min', custom_id: settingsIds.timeout10min, style: timeout === 600000 ? 1 : 2 }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '60% Quality', custom_id: settingsIds.quality60, style: quality === 60 ? 1 : 2 },
                                                                        { type: 2, label: '80% Quality', custom_id: settingsIds.quality80, style: quality === 80 ? 1 : 2 },
                                                                        { type: 2, label: '100% Quality', custom_id: settingsIds.quality100, style: quality === 100 ? 1 : 2 }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { 
                                                                                type: 2, 
                                                                                label: autoClose ? 'Disable Auto-Close' : 'Enable Auto-Close', 
                                                                                custom_id: settingsIds.autoCloseToggle, 
                                                                                style: autoClose ? 4 : 3 
                                                                        }
                                                                ]
                                                        },
                                                        {
                                                                type: 1,
                                                                components: [
                                                                        { type: 2, label: '← Back', custom_id: settingsIds.back, style: 2 }
                                                                ]
                                                        }
                                                ]
                                        });
                                }

                                await int.createFollowup({
                                        embeds: [{
                                                title: '⚙️ Settings',
                                                description: 'Configure your browsing preferences',
                                                color: 0x7289DA,
                                                fields: [
                                                        {
                                                                name: '⚡ Performance Mode',
                                                                value: userSettings.performanceMode ? 
                                                                        `✅ Enabled (${userSettings.updateInterval / 1000}s interval)` : 
                                                                        '❌ Disabled',
                                                                inline: false
                                                        },
                                                        {
                                                                name: '🌐 Browser Settings',
                                                                value: `Browser: 🌐 Chrome\n` +
                                                                       `Dark Mode: ${userSettings.darkMode ? '✅ Enabled' : '❌ Disabled'}\n` +
                                                                       `Ad Block: ${userSettings.adBlock !== false ? '✅ Enabled' : '❌ Disabled'}`,
                                                                inline: false
                                                        },
                                                        {
                                                                name: '🕐 Session Settings',
                                                                value: `Timeout: ${userSettings.sessionTimeout / 60000} min\n` +
                                                                       `Screenshot Quality: ${userSettings.screenshotQuality}%\n` +
                                                                       `Auto-Close: ${userSettings.autoCloseBrowser ? '✅ Enabled' : '❌ Disabled'}`,
                                                                inline: false
                                                        }
                                                ],
                                                footer: { text: 'Select a category to configure' }
                                        }],
                                        components: [
                                                {
                                                        type: 1,
                                                        components: [
                                                                { 
                                                                        type: 2, 
                                                                        label: `${userSettings.performanceMode ? '⚡' : '💤'} Performance`, 
                                                                        custom_id: settingsIds.performance, 
                                                                        style: 1 
                                                                },
                                                                { 
                                                                        type: 2, 
                                                                        label: '🌐 Browser', 
                                                                        custom_id: settingsIds.browserSettings, 
                                                                        style: 2 
                                                                },
                                                                { 
                                                                        type: 2, 
                                                                        label: '🕐 Session', 
                                                                        custom_id: settingsIds.sessionSettings, 
                                                                        style: 2 
                                                                }
                                                        ]
                                                }
                                        ],
                                        flags: 64
                                });

                                const settingsCollector = await collectInteractions({
                                        client: bot,
                                        componentType: 2,
                                        filter: (_) => _.member.id === int.member.id && Object.values(settingsIds).includes(_.data.custom_id),
                                        time: 300000
                                });

                                settingsCollector.on('collect', async settingsInt => {
                                        await settingsInt.acknowledge();

                                        const customId = settingsInt.data.custom_id;

                                        if (customId === settingsIds.performance) {
                                                console.log(chalk.cyan('⚙️  Opening Performance settings'));
                                                await showPerformanceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.browserSettings) {
                                                console.log(chalk.cyan('⚙️  Opening Browser settings'));
                                                await showBrowserSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.browserChoice) {
                                                console.log(chalk.cyan('⚙️  Opening Browser Choice settings'));
                                                await showBrowserChoiceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.adBlockToggle) {
                                                const currentSettings = getUserSettings(int.member.id);
                                                const newValue = currentSettings.adBlock === false ? true : false;

                                                setUserSettings(int.member.id, { adBlock: newValue });
                                                userSettings.adBlock = newValue;

                                                console.log(chalk.green('🛡️  Ad Block:'), chalk.yellow(newValue ? 'Enabled' : 'Disabled'));

                                                await showBrowserSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.darkModeToggle) {
                                                const currentSettings = getUserSettings(int.member.id);
                                                const newValue = !currentSettings.darkMode;

                                                setUserSettings(int.member.id, { darkMode: newValue });
                                                userSettings.darkMode = newValue;

                                                console.log(chalk.green('🌙 Dark mode:'), chalk.yellow(newValue ? 'Enabled' : 'Disabled'));

                                                await showBrowserSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.perfToggle) {
                                                const currentSettings = getUserSettings(int.member.id);
                                                const newValue = !currentSettings.performanceMode;

                                                setUserSettings(int.member.id, { performanceMode: newValue });
                                                userSettings.performanceMode = newValue;

                                                console.log(chalk.green('⚡ Performance mode:'), chalk.yellow(newValue ? 'Enabled' : 'Disabled'));

                                                if (newValue && runningUser === int.member.id) {
                                                        await startPerformanceMode(bot, int.member.id, currentSettings.updateInterval);
                                                } else {
                                                        await stopPerformanceMode();
                                                }

                                                await showPerformanceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.interval2s) {
                                                setUserSettings(int.member.id, { updateInterval: 2000 });
                                                userSettings.updateInterval = 2000;
                                                console.log(chalk.green('⚡ Update interval set to:'), chalk.yellow('2s'));

                                                if (userSettings.performanceMode && runningUser === int.member.id) {
                                                        await startPerformanceMode(bot, int.member.id, 2000);
                                                }

                                                await showPerformanceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.interval5s) {
                                                setUserSettings(int.member.id, { updateInterval: 5000 });
                                                userSettings.updateInterval = 5000;
                                                console.log(chalk.green('⚡ Update interval set to:'), chalk.yellow('5s'));

                                                if (userSettings.performanceMode && runningUser === int.member.id) {
                                                        await startPerformanceMode(bot, int.member.id, 5000);
                                                }

                                                await showPerformanceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.interval10s) {
                                                setUserSettings(int.member.id, { updateInterval: 10000 });
                                                userSettings.updateInterval = 10000;
                                                console.log(chalk.green('⚡ Update interval set to:'), chalk.yellow('10s'));

                                                if (userSettings.performanceMode && runningUser === int.member.id) {
                                                        await startPerformanceMode(bot, int.member.id, 10000);
                                                }

                                                await showPerformanceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.browserChrome) {
                                                setUserSettings(int.member.id, { browser: 'chrome' });
                                                userSettings.browser = 'chrome';
                                                console.log(chalk.green('🌐 Default browser set to:'), chalk.yellow('Chrome'));
                                                await showBrowserChoiceMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.sessionSettings) {
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.timeout3min) {
                                                setUserSettings(int.member.id, { sessionTimeout: 180000 });
                                                userSettings.sessionTimeout = 180000;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.timeout5min) {
                                                setUserSettings(int.member.id, { sessionTimeout: 300000 });
                                                userSettings.sessionTimeout = 300000;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.timeout10min) {
                                                setUserSettings(int.member.id, { sessionTimeout: 600000 });
                                                userSettings.sessionTimeout = 600000;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.quality60) {
                                                setUserSettings(int.member.id, { screenshotQuality: 60 });
                                                userSettings.screenshotQuality = 60;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.quality80) {
                                                setUserSettings(int.member.id, { screenshotQuality: 80 });
                                                userSettings.screenshotQuality = 80;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.quality100) {
                                                setUserSettings(int.member.id, { screenshotQuality: 100 });
                                                userSettings.screenshotQuality = 100;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.autoCloseToggle) {
                                                const currentSettings = getUserSettings(int.member.id);
                                                const newValue = !currentSettings.autoCloseBrowser;
                                                setUserSettings(int.member.id, { autoCloseBrowser: newValue });
                                                userSettings.autoCloseBrowser = newValue;
                                                await showSessionSettingsMenu(settingsInt);
                                        }
                                        else if (customId === settingsIds.back) {
                                                console.log(chalk.cyan('⚙️  Returning to main settings menu'));
                                                await showMainMenu(settingsInt);
                                        }
                                });

                                settingsCollector.on('end', () => {
                                        console.log(chalk.dim('⚙️  Settings menu timed out'));
                                });
                        }
                }
        });

        bot.connect();
};
