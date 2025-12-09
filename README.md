
# Chromie - Secure Multi-Server Discord Browser Bot


⚠️ **Important Security Notice**: This bot provides browser access through Discord. Please read the security section carefully before deploying.

## 🔒 Security Features

- ✅ **Per-Server Isolation** - Each server gets its own browser session
- ✅ **Rate Limiting** - Prevents command spam (10 commands/minute per user)
- ✅ **URL Validation** - Blocks local IPs, file:// protocol, and malicious URLs
- ✅ **Content Filtering** - NSFW and malicious content blocking
- ✅ **Input Sanitization** - All user inputs are sanitized
- ✅ **No File System Access** - Users cannot access local files
- ✅ **Ad Blocking** - Blocks ads and trackers by default

## ⚙️ Features

- 🎛 **Cuting edge dashboard** 
- 🌐 **Browse the web** directly from Discord with isolated browser sessions per server
- 🎮 **Interactive controls** - Navigate using Discord buttons
- ⌨️ **Typing support** - Type text directly into web pages
- 🚀 **Quick presets** - Instantly open popular websites
- 📜 **Scroll functionality** - Scroll up and down pages
- ◀️▶️ **Navigation** - Go back and forward through browsing history
- 📚 **History tracking** - View the last 10 URLs visited
- 🎯 **Adjustable mouse sensitivity** - Fine-tune cursor movement
- 🛡️ **Content filtering** - Built-in filters for safety
- 📸 **Live screenshots** - Real-time browser updates

## 📦 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Chromie
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_discord_bot_token_here
```

**Note:** The bot no longer requires a GUILD_ID. It will work in any server where it's added!

Get your bot invite link:
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Copy your Client ID
4. Use this invite URL (replace YOUR_CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=414464724032&scope=bot%20applications.commands
```

4. **Run the bot**
```bash
npm start
```

## 🔐 Security Best Practices

### Before Deploying:

1. **Never share your bot token** - Keep it in Secrets/environment variables only
2. **Review the blacklist** - Add any additional blocked keywords in `index.js`
3. **Set appropriate rate limits** - Adjust `RATE_LIMIT_MAX` based on your needs
4. **Monitor resource usage** - Each browser session uses ~500MB RAM
5. **Limit concurrent sessions** - Default is 1 per server (recommended)

### Recommended Settings:

```env
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX=10        # 10 commands per minute
MAX_SESSION_DURATION=600000  # 10 minutes max session
```

## 📝 Available Commands

- `/browse [url]` - Start browsing (optionally provide a URL)
- `/presets` - Quick access to popular websites
- `/ping` - Check bot status and latency
- `/settings` - Configure your browsing preferences

## ⚠️ Known Limitations

- **Not suitable for public bots** - Resource intensive, requires monitoring
- **No persistent storage** - Deployments reset filesystem on redeploy
- **Single session per server** - Only one user can browse at a time per server
- **Memory intensive** - Chromium requires significant RAM

## 🛠️ Configuration

### User Settings (per-user):
- Dark mode
- Ad blocking
- Screenshot quality
- Session timeout
- Auto-close browser
- Performance mode

### System Settings (environment):
- Rate limiting
- Content filtering
- Maximum session duration

## 📊 Resource Requirements

- **RAM**: ~500MB per active browser session
- **CPU**: 1 vCPU minimum per session
- **Storage**: ~200MB for browser binaries

## 🤝 Contributing

This is a personal project. Feel free to fork and modify for your own use.

## 📄 License

MIT License - Use at your own risk

## ⚠️ Disclaimer

This bot provides access to web browsing through Discord. Users can access any public website. The bot includes security measures, but no system is perfect. Use responsibly and monitor usage.

**Not recommended for:**
- Public Discord servers with untrusted users
- Production environments without monitoring
- Servers with strict compliance requirements

**Recommended for:**
- Private servers with trusted members
- Development and testing
- Educational purposes
