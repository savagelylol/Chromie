
const chalk = require('chalk');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

class BrowserAdapter {
    static async launchChrome(chromeLaunchOptions) {
        try {
            console.log(chalk.yellow('  Launching Chrome with Discordmium Stealth...'));

            const stealthArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-size=1920,1080',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--lang=en-US,en'
            ];

            const mergedOptions = {
                ...chromeLaunchOptions,
                args: [...(chromeLaunchOptions.args || []), ...stealthArgs],
                headless: 'new',
                ignoreDefaultArgs: ['--enable-automation']
            };

            const browser = await puppeteer.launch(mergedOptions);
            console.log(chalk.green('✓ Chrome browser initialized with stealth mode'));

            return { browser, type: 'puppeteer' };
        } catch (error) {
            console.log(chalk.red('✗ Chrome launch failed:'), chalk.dim(error.message));
            throw error;
        }
    }

    static async createPage(browser, browserType, darkMode = false) {
        let page;
        
        page = await browser.newPage();
        
        const userAgent = getRandomUserAgent();
        await page.setUserAgent(userAgent);
        
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        });
        
        if (darkMode) {
            await page.emulateMediaFeatures([
                { name: 'prefers-color-scheme', value: 'dark' }
            ]);
        }

        await this.applyAntiDetection(page);

        if (!page) {
            throw new Error(`Failed to create page with ${browserType}`);
        }

        return page;
    }

    static async applyAntiDetection(page) {
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                    ];
                    plugins.item = (index) => plugins[index];
                    plugins.namedItem = (name) => plugins.find(p => p.name === name);
                    plugins.refresh = () => {};
                    return plugins;
                }
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'es']
            });
            
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
            
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8
            });
            
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters)
            );
            
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter.call(this, parameter);
            };
            
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, attributes) {
                if (type === '2d') {
                    const context = originalGetContext.call(this, type, attributes);
                    const originalFillText = context.fillText;
                    context.fillText = function(...args) {
                        return originalFillText.apply(this, args);
                    };
                    return context;
                }
                return originalGetContext.call(this, type, attributes);
            };
        });

        page.on('response', async (response) => {
            const url = response.url();
            const status = response.status();
            
            if (url.includes('google.com/sorry') || 
                url.includes('ipv4.google.com/sorry') ||
                url.includes('www.google.com/sorry') ||
                url.includes('consent.google.com') ||
                (status === 429)) {
                console.log(chalk.yellow('⚠️  Detected anti-bot page, attempting bypass...'));
            }
        });

        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('/sorry/') || url.includes('captcha')) {
                console.log(chalk.yellow('⚠️  Captcha/sorry page detected'));
            }
        });
    }

    static async handleSearchEngine(page, url) {
        const searchEngineConfigs = {
            google: {
                patterns: ['google.com/search', 'google.com/?q=', 'google.co'],
                sorryPattern: ['google.com/sorry', '/sorry/', 'ipv4.google.com'],
                alternative: 'https://www.google.com/ncr',
                cookieConsent: async (p) => {
                    try {
                        const consentButton = await p.$('button[id="L2AGLb"]');
                        if (consentButton) await consentButton.click();
                    } catch (e) {}
                }
            },
            bing: {
                patterns: ['bing.com/search', 'bing.com/?q='],
                sorryPattern: ['bing.com/captcha'],
                alternative: 'https://www.bing.com/?cc=us'
            },
            duckduckgo: {
                patterns: ['duckduckgo.com/?q=', 'duckduckgo.com/html'],
                sorryPattern: [],
                alternative: 'https://html.duckduckgo.com/html/'
            },
            yahoo: {
                patterns: ['search.yahoo.com'],
                sorryPattern: ['consent.yahoo.com'],
                alternative: 'https://search.yahoo.com'
            },
            ecosia: {
                patterns: ['ecosia.org/search'],
                sorryPattern: [],
                alternative: 'https://www.ecosia.org'
            },
            startpage: {
                patterns: ['startpage.com'],
                sorryPattern: [],
                alternative: 'https://www.startpage.com'
            },
            brave: {
                patterns: ['search.brave.com'],
                sorryPattern: [],
                alternative: 'https://search.brave.com'
            },
            qwant: {
                patterns: ['qwant.com'],
                sorryPattern: [],
                alternative: 'https://www.qwant.com'
            }
        };

        const currentUrl = page.url();
        
        for (const [engine, config] of Object.entries(searchEngineConfigs)) {
            for (const pattern of config.sorryPattern) {
                if (currentUrl.includes(pattern)) {
                    console.log(chalk.yellow(`⚠️  ${engine} anti-bot detected, redirecting...`));
                    
                    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
                    
                    if (engine === 'google') {
                        try {
                            await page.goto('https://html.duckduckgo.com/html/', { 
                                waitUntil: 'domcontentloaded',
                                timeout: 30000 
                            });
                            console.log(chalk.green('✓ Redirected to DuckDuckGo as fallback'));
                            return true;
                        } catch (e) {
                            console.log(chalk.yellow('  Fallback failed, trying Startpage...'));
                            await page.goto('https://www.startpage.com', { 
                                waitUntil: 'domcontentloaded',
                                timeout: 30000 
                            });
                            return true;
                        }
                    }
                    
                    return false;
                }
            }
        }
        
        return true;
    }

    static async closeBrowser(browser, browserType) {
        try {
            if (!browser) return;

            try {
                const pages = await browser.pages();
                for (const p of pages) {
                    await p.close().catch(() => {});
                }
            } catch (e) {
            }

            const browserProcess = browser.process();
            
            try {
                await browser.close();
            } catch (e) {
            }

            if (browserProcess) {
                try {
                    browserProcess.kill('SIGKILL');
                } catch (e) {
                }
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            console.log(chalk.yellow('⚠️  Browser cleanup error:'), chalk.dim(e.message));
        }
    }

    static isConnected(browser, browserType) {
        if (!browser) return false;
        return browser.isConnected();
    }

    static async forceEndMaintenance(guildId, existingDb = null) {
        try {
            const knex = require('knex');
            const db = existingDb || knex({
                client: 'pg',
                connection: process.env.POSTGRES_URL || process.env.DATABASE_URL,
                pool: { min: 0, max: 5 }
            });

            console.log(chalk.yellow(`🔓 Force ending maintenance mode for guild ${guildId}...`));
            
            await db('guild_settings')
                .where({ guild_id: guildId, setting_key: 'maintenanceMode' })
                .update({ setting_value: JSON.stringify(false) });
            
            console.log(chalk.green(`✓ Maintenance mode cleared for guild ${guildId}`));
            
            if (!existingDb) {
                await db.destroy();
            }
        } catch (error) {
            console.error(chalk.red('Error clearing maintenance mode:'), error);
            throw error;
        }
    }
}

module.exports = BrowserAdapter;
