/* eslint-disable */
const chalk = require('chalk');

const SEARCH_ENGINE_ALTERNATIVES = {
    'google.com/sorry': 'https://html.duckduckgo.com/html/',
    'ipv4.google.com/sorry': 'https://html.duckduckgo.com/html/',
    'consent.google.com': 'https://www.google.com/ncr',
    'bing.com/captcha': 'https://www.startpage.com',
    'consent.yahoo.com': 'https://search.yahoo.com'
};

async function pluginInit(page) {
    if (page._browserType === 'puppeteer') {
        try {
            const client = await page.target().createCDPSession();
            await client.send('Network.enable');
            
            const blockedDomains = [
                'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
                'google-analytics.com', 'googletagmanager.com', 'adservice.google.com',
                'facebook.com/tr', 'facebook.net', 'connect.facebook.net',
                'amazon-adsystem.com', 'ads.yahoo.com', 'ads.msn.com',
                'adnexus.net', 'adnxs.com', 'criteo.com', 'outbrain.com',
                'taboola.com', 'hotjar.com', 'mixpanel.com', 'segment.io',
                'amplitude.com', 'fullstory.com', 'clarity.ms', 'newrelic.com',
                'sentry.io', 'popads.net', 'popcash.net', 'propellerads.com'
            ];
            
            await client.send('Network.setBlockedURLs', {
                urls: blockedDomains.map(domain => `*${domain}*`)
            });
            
            console.log(chalk.cyan('🛡️  Ad blocking enabled'));
        } catch (e) {
        }
    }
    
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        delete navigator.__proto__.webdriver;

        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );

        window.chrome = {
            runtime: {
                connect: function() { return { onMessage: { addListener: function() {} } }; },
                sendMessage: function() {}
            },
            loadTimes: function() {
                return {
                    commitLoadTime: Date.now() / 1000,
                    connectionInfo: 'http/1.1',
                    finishDocumentLoadTime: Date.now() / 1000,
                    finishLoadTime: Date.now() / 1000,
                    firstPaintAfterLoadTime: 0,
                    firstPaintTime: Date.now() / 1000,
                    navigationType: 'Other',
                    npnNegotiatedProtocol: 'http/1.1',
                    requestTime: Date.now() / 1000,
                    startLoadTime: Date.now() / 1000,
                    wasAlternateProtocolAvailable: false,
                    wasFetchedViaSpdy: false,
                    wasNpnNegotiated: false
                };
            },
            csi: function() {
                return {
                    onloadT: Date.now(),
                    pageT: Date.now() - performance.timing.navigationStart,
                    startE: performance.timing.navigationStart,
                    tran: 15
                };
            },
            app: {
                isInstalled: false,
                InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
                RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
            }
        };

        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', length: 1 },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', length: 2 }
                ];
                plugins.item = (i) => plugins[i] || null;
                plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
                plugins.refresh = () => {};
                Object.setPrototypeOf(plugins, PluginArray.prototype);
                return plugins;
            },
        });

        Object.defineProperty(navigator, 'mimeTypes', {
            get: () => {
                const mimeTypes = [
                    { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
                    { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
                ];
                mimeTypes.item = (i) => mimeTypes[i] || null;
                mimeTypes.namedItem = (name) => mimeTypes.find(m => m.type === name) || null;
                Object.setPrototypeOf(mimeTypes, MimeTypeArray.prototype);
                return mimeTypes;
            }
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });

        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
        });

        Object.defineProperty(navigator, 'vendor', {
            get: () => 'Google Inc.',
        });

        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8,
        });

        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
        });

        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 0,
        });

        Object.defineProperty(screen, 'colorDepth', {
            get: () => 24,
        });

        Object.defineProperty(screen, 'pixelDepth', {
            get: () => 24,
        });

        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.call(this, parameter);
        };

        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter2.call(this, parameter);
        };

        const timeOffset = Math.random() * 100;
        const originalNow = Date.now;
        Date.now = function() {
            return originalNow.call(Date) + timeOffset;
        };

        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
            return -300;
        };

        if (window.Notification) {
            window.Notification.requestPermission = () => Promise.resolve('default');
        }

        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            if (this.width === 16 && this.height === 16) {
                return originalToDataURL.apply(this, arguments);
            }
            return originalToDataURL.apply(this, arguments);
        };

        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
            return originalGetImageData.call(this, sx, sy, sw, sh);
        };
    });

    page.on('framenavigated', async (frame) => {
        if (frame !== page.mainFrame()) return;
        
        const url = frame.url();
        
        for (const [pattern, alternative] of Object.entries(SEARCH_ENGINE_ALTERNATIVES)) {
            if (url.includes(pattern)) {
                console.log(chalk.yellow(`⚠️  Anti-bot page detected: ${pattern}`));
                console.log(chalk.cyan(`🔄 Redirecting to alternative: ${alternative}`));
                
                await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
                
                try {
                    await page.goto(alternative, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    console.log(chalk.green('✓ Successfully redirected'));
                } catch (e) {
                    console.log(chalk.red('✗ Redirect failed:'), e.message);
                }
                break;
            }
        }
        
        if (url.includes('google.com') && !url.includes('sorry')) {
            try {
                await frame.evaluate(() => {
                    const consentButtons = document.querySelectorAll('button');
                    for (const btn of consentButtons) {
                        if (btn.textContent.includes('Accept') || 
                            btn.textContent.includes('I agree') ||
                            btn.textContent.includes('Agree')) {
                            btn.click();
                            break;
                        }
                    }
                });
            } catch (e) {
            }
        }
    });

    await page.evaluateOnNewDocument(() => {

        if (window !== window.parent) return;

        window.addEventListener('DOMContentLoaded', () => {

            const box = document.createElement('face-was-here');
            const element = document.createElement('style');

            element.innerHTML = `
              face-was-here {
                pointer-events: none;
                position: absolute;
                top: 980;
                z-index: 10000;
                left: 400;
                width: 20px;
                height: 20px;
                background: rgb(255 0 0);
                border: 1px solid white;
                border-radius: 10px;
                margin: -10px 0 0 -10px;
                padding: 0;
                transition: background .2s, border-radius .2s, border-color .2s;
            }
            face-was-here.i-1 {
                transition: none;
                background: rgba(0,0,0,0.9);
            }
            face-was-here.i-2 {
                transition: none;
                border-color: rgba(0,0,255,0.9);
            }
            face-was-here.i-3 {
                transition: none;
                border-radius: 4px;
            }
            face-was-here.i-4 {
                transition: none;
                border-color: rgba(255,0,0,0.9);
            }
            face-was-here.i-5 {
                transition: none;
                border-color: rgba(0,255,0,0.9);
            }
            `;

            document.head.appendChild(element);
            document.body.appendChild(box);

            box.style.left = '980px';
            box.style.top = '400px';

            document.addEventListener('mousemove', event => {
                box.style.left = event.pageX + 'px';
                box.style.top = event.pageY + 'px';
                update(event.buttons);
            }, true);

            document.addEventListener('mousedown', event => {
                update(event.buttons);
                box.classList.add('i-' + event.which);
            }, true);

            document.addEventListener('mouseup', event => {
                update(event.buttons);
                box.classList.remove('i-' + event.which);
            }, true);

            function update(buttons) {
                for (let i = 0; i < 5; i++) {
                    box.classList.toggle('i-' + i, buttons & (1 << i));
                }
            }
        }, false);
    });
}

module.exports = pluginInit;
