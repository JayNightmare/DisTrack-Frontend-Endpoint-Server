const express = require("express");
const path = require("path");
const app = express();
const User = require("./User.js");
const { connectToDatabase } = require("./database.js");
const axios = require("axios");
const { API_KEY, PORT } = require("./config.js");

app.use(express.json());

connectToDatabase();

// * Enter Point
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
    console.log("Server running! But someone is being a naughty femboy...");
});

// * Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// * Generate custom embed image for social media
app.get("/embed-image/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const totalTimeFormatted = Math.floor(user.totalCodingTime / 3600);
        const topLanguages = Object.entries(user.languages)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([lang, time]) => ({ lang, time }));

        // Generate SVG image with user stats
        const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>
    
    <!-- Main container -->
    <rect x="60" y="60" width="1080" height="510" rx="20" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    
    <!-- DisTrack Logo/Title -->
    <text x="100" y="130" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
        DisTrack Profile
    </text>
    
    <!-- User Info -->
    <text x="100" y="190" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" filter="url(#glow)">
        ${(user.displayName || user.username).substring(0, 20)}
    </text>
    <text x="100" y="230" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)">
        @${user.username.substring(0, 25)}
    </text>
    
    <!-- Stats Grid -->
    <!-- Total Coding Time -->
    <rect x="100" y="280" width="240" height="120" rx="15" fill="rgba(255,255,255,0.15)"/>
    <text x="220" y="320" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">
        ${totalTimeFormatted}h
    </text>
    <text x="220" y="350" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Total Coded
    </text>
    <text x="220" y="375" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">
        🚀
    </text>
    
    <!-- Current Streak -->
    <rect x="360" y="280" width="240" height="120" rx="15" fill="rgba(255,255,255,0.15)"/>
    <text x="480" y="320" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">
        ${user.currentStreak}
    </text>
    <text x="480" y="350" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Current Streak
    </text>
    <text x="480" y="375" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">
        🔥
    </text>
    
    <!-- Longest Streak -->
    <rect x="620" y="280" width="240" height="120" rx="15" fill="rgba(255,255,255,0.15)"/>
    <text x="740" y="320" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">
        ${user.longestStreak}
    </text>
    <text x="740" y="350" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Longest Streak
    </text>
    <text x="740" y="375" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">
        📈
    </text>
    
    <!-- Languages -->
    <rect x="880" y="280" width="240" height="120" rx="15" fill="rgba(255,255,255,0.15)"/>
    <text x="1000" y="320" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">
        ${Object.keys(user.languages).length}
    </text>
    <text x="1000" y="350" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Languages
    </text>
    <text x="1000" y="375" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">
        💻
    </text>
    
    <!-- Top Languages -->
    <text x="100" y="460" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)">
        Top Languages: ${topLanguages.map((l) => l.lang).join(" • ")}
    </text>
    
    <!-- Footer -->
    <text x="100" y="520" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)">
        View full profile at distrack.endpoint-system.uk
    </text>
</svg>`;

        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
        return res.send(svg);
    } catch (error) {
        console.error("Error generating embed image:", error);

        // Fallback to a simple error image
        const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#667eea"/>
    <text x="600" y="315" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
        DisTrack Profile
    </text>
</svg>`;

        res.setHeader("Content-Type", "image/svg+xml");
        return res.send(errorSvg);
    }
});

// * Get user by user id and check the User-Agent header for bots/crawlers (Discord, Twitter, Facebook, etc.)
app.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
    const userAgent = req.headers["user-agent"] || "";

    console.log(`GET /user/${userId} endpoint hit`);
    console.log(`User-Agent: ${userAgent}`);

    try {
        // Fetch user data
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if request is from a bot/crawler
        const botPatterns = [
            "Discordbot",
            "Twitterbot",
            "facebookexternalhit",
            "LinkedInBot",
            "WhatsApp",
            "TelegramBot",
            "SkypeUriPreview",
            "GoogleBot",
            "bingbot",
            "YandexBot",
            "slackbot",
        ];

        const isBot = botPatterns.some((pattern) =>
            userAgent.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isBot) {
            // Return HTML with Open Graph and Twitter Card meta tags
            const totalTimeFormatted = Math.floor(user.totalCodingTime / 3600);
            const avatarUrl =
                user.avatarUrl || "https://avatar.iran.liara.run/public";

            // Create a more engaging description
            const languagesList = Object.keys(user.languages)
                .slice(0, 3)
                .join(", ");
            const moreLanguages =
                Object.keys(user.languages).length > 3
                    ? ` +${Object.keys(user.languages).length - 3} more`
                    : "";

            const enhancedDescription = `Coding warrior with ${totalTimeFormatted}h of experience! 🚀
Current streak: ${user.currentStreak} days 🔥 | Best streak: ${user.longestStreak} days 📈
Languages: ${languagesList}${moreLanguages} | View full profile on DisTrack`;

            // Generate a custom embed image URL (we'll create an endpoint for this)
            const embedImageUrl = `https://distrack.endpoint-system.uk/embed-image/${userId}`;

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.displayName || user.username} - DisTrack Profile</title>
    
    <!-- Enhanced Open Graph Meta Tags -->
    <meta property="og:title" content="🏆 ${
        user.displayName || user.username
    } - DisTrack Coding Profile">
    <meta property="og:description" content="${enhancedDescription}">
    <meta property="og:image" content="${embedImageUrl}">
    <meta property="og:image:alt" content="${
        user.displayName || user.username
    }'s coding statistics on DisTrack">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="https://distrack.endpoint-system.uk/user/${userId}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="DisTrack - Coding Progress Tracker">
    
    <!-- Enhanced Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="🏆 ${
        user.displayName || user.username
    } - DisTrack Profile">
    <meta name="twitter:description" content="${enhancedDescription}">
    <meta name="twitter:image" content="${embedImageUrl}">
    <meta name="twitter:image:alt" content="${
        user.displayName || user.username
    }'s coding statistics">
    
    <!-- Discord-specific enhancements -->
    <meta name="theme-color" content="#667eea">
    <meta property="og:color" content="#667eea">
    
    <!-- Additional Meta Tags -->
    <meta name="description" content="${
        user.displayName || user.username
    }'s coding statistics on DisTrack">
    <meta name="author" content="DisTrack">
    
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 2rem;
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .profile-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 100%;
        }
        .avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            margin: 0 auto 1rem;
            border: 4px solid rgba(255, 255, 255, 0.3);
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .stat {
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 10px;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="profile-card">
        <img src="${avatarUrl}" alt="${
                user.displayName || user.username
            }" class="avatar" onerror="this.src='https://distrack.endpoint-system.uk/default-avatar.png'">
        <h1>${user.displayName || user.username}</h1>
        <p>@${user.username}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${totalTimeFormatted}h</div>
                <div class="stat-label">Total Coded</div>
            </div>
            <div class="stat">
                <div class="stat-value">${user.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
            </div>
            <div class="stat">
                <div class="stat-value">${user.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
            </div>
            <div class="stat">
                <div class="stat-value">${
                    Object.keys(user.languages).length
                }</div>
                <div class="stat-label">Languages</div>
            </div>
        </div>
    </div>
    
    <script>
        // Redirect to full app after a delay for human visitors
        setTimeout(() => {
            if (navigator.userAgent.indexOf('bot') === -1) {
                window.location.href = 'https://distrack.endpoint-system.uk/user/${userId}';
            }
        }, 3000);
    </script>
</body>
</html>`;

            console.log(
                `Bot/crawler detected: ${userAgent.substring(0, 50)}...`
            );
            return res.setHeader("Content-Type", "text/html").send(html);
        } else if (req.query.redirect) {
            return res.redirect(
                `https://distrack.endpoint-system.uk/user/${userId}`
            );
        }

        // Return JSON for regular requests
        const userProfile = {
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            discordId: user.discordId,
            totalCodingTime: user.totalCodingTime,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            lastSessionDate: user.lastSessionDate,
            languages: user.languages,
            isPublic: user.isPublic,
            timezone: user.timezone,
            bio: user.bio,
            socials: user.socials || {},
            linkedAt: user.linkedAt,
            lastLinkedAt: user.lastLinkedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.status(200).json(userProfile);
        console.log(
            `User profile for ${userId} retrieved successfully (JSON response)`
        );
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Error fetching user profile" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
