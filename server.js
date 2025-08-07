const express = require("express");
const path = require("path");
const sharp = require("sharp");
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

        const avatarUrl =
            user.avatarUrl || "https://avatar.iran.liara.run/public";
        const userBio = user.bio
            ? user.bio.substring(0, 80) + (user.bio.length > 80 ? "..." : "")
            : "No bio available";
        const displayName = (user.displayName || user.username).substring(
            0,
            20
        );
        const username = user.username.substring(0, 25);

        // Try to fetch the user's avatar and convert to base64 for embedding
        let avatarDataUrl = null;
        try {
            if (
                avatarUrl &&
                avatarUrl !== "https://avatar.iran.liara.run/public"
            ) {
                const avatarResponse = await axios.get(avatarUrl, {
                    responseType: "arraybuffer",
                    timeout: 5000,
                    headers: {
                        "User-Agent": "DisTrack-Bot/1.0",
                    },
                });
                const avatarBase64 = Buffer.from(
                    avatarResponse.data,
                    "binary"
                ).toString("base64");
                const contentType =
                    avatarResponse.headers["content-type"] || "image/jpeg";
                avatarDataUrl = `data:${contentType};base64,${avatarBase64}`;
            }
        } catch (avatarError) {
            console.log("Failed to fetch avatar:", avatarError.message);
            // Will use placeholder instead
        }

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
        <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
        <clipPath id="avatar-clip">
            <circle cx="180" cy="180" r="50"/>
        </clipPath>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>
    
    <!-- Main container -->
    <rect x="40" y="40" width="1120" height="550" rx="25" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="2" filter="url(#shadow)"/>
    
    <!-- Header Section with Logo and Branding -->
    <rect x="60" y="60" width="1080" height="80" rx="15" fill="rgba(255,255,255,0.05)"/>
    
    <!-- DisTrack Logo (stylized D) -->
    <circle cx="110" cy="100" r="25" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
    <text x="110" y="110" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">D</text>
    
    <!-- DisTrack Brand Text -->
    <text x="150" y="95" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">DisTrack</text>
    <text x="150" y="115" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">Coding Progress Tracker</text>
    
    <!-- User Profile Section -->
    <!-- Profile Picture Background Circle -->
    <circle cx="180" cy="180" r="55" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
    
    <!-- Profile Picture -->
    ${
        avatarDataUrl
            ? `<image href="${avatarDataUrl}" x="130" y="130" width="100" height="100" clip-path="url(#avatar-clip)" preserveAspectRatio="xMidYMid slice"/>`
            : `<circle cx="180" cy="180" r="50" fill="rgba(255,255,255,0.1)"/>
         <text x="180" y="190" font-family="Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.6)" text-anchor="middle">👤</text>`
    }
    
    <!-- User Info -->
    <text x="260" y="160" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" filter="url(#glow)">
        ${displayName}
    </text>
    <text x="260" y="185" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)">
        @${username}
    </text>
    
    <!-- User Bio -->
    <text x="260" y="210" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">
        ${userBio}
    </text>
    
    <!-- Stats Grid -->
    <!-- Total Coding Time -->
    <rect x="80" y="260" width="200" height="100" rx="15" fill="rgba(255,255,255,0.15)" filter="url(#shadow)"/>
    <text x="180" y="290" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
        ${totalTimeFormatted}h
    </text>
    <text x="180" y="315" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Total Coded
    </text>
    <text x="180" y="335" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">
        🚀
    </text>
    
    <!-- Current Streak -->
    <rect x="300" y="260" width="200" height="100" rx="15" fill="rgba(255,255,255,0.15)" filter="url(#shadow)"/>
    <text x="400" y="290" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
        ${user.currentStreak}
    </text>
    <text x="400" y="315" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Current Streak
    </text>
    <text x="400" y="335" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">
        🔥
    </text>
    
    <!-- Longest Streak -->
    <rect x="520" y="260" width="200" height="100" rx="15" fill="rgba(255,255,255,0.15)" filter="url(#shadow)"/>
    <text x="620" y="290" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
        ${user.longestStreak}
    </text>
    <text x="620" y="315" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Longest Streak
    </text>
    <text x="620" y="335" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">
        📈
    </text>
    
    <!-- Languages -->
    <rect x="740" y="260" width="200" height="100" rx="15" fill="rgba(255,255,255,0.15)" filter="url(#shadow)"/>
    <text x="840" y="290" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
        ${Object.keys(user.languages).length}
    </text>
    <text x="840" y="315" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Languages
    </text>
    <text x="840" y="335" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle">
        💻
    </text>
    
    <!-- Additional Info Section -->
    <rect x="80" y="380" width="860" height="80" rx="15" fill="rgba(255,255,255,0.08)" filter="url(#shadow)"/>
    
    <!-- Top Languages -->
    <text x="100" y="405" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">
        🏆 Top Languages:
    </text>
    <text x="100" y="425" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.9)">
        ${topLanguages.map((l) => l.lang).join(" • ")}
    </text>
    
    <!-- Social Links Section (if available) -->
    <text x="100" y="450" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">
        📊 View detailed analytics and progress at distrack.endpoint-system.uk
    </text>
    
    <!-- Decorative Elements -->
    <!-- Corner accent -->
    <circle cx="1050" cy="150" r="3" fill="rgba(255,255,255,0.3)"/>
    <circle cx="1070" cy="140" r="2" fill="rgba(255,255,255,0.2)"/>
    <circle cx="1090" cy="160" r="1.5" fill="rgba(255,255,255,0.1)"/>
    
    <!-- Bottom right branding -->
    <text x="1120" y="580" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.5)" text-anchor="end">
        Powered by DisTrack
    </text>
</svg>`;

        const svgBuffer = Buffer.from(svg);
        const pngBuffer = await sharp(svgBuffer).png().toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
        return res.send(pngBuffer);
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

        const errorSvgCon = Buffer.from(errorSvg);
        const errorPngBuffer = await sharp(errorSvgCon).png().toBuffer();

        res.setHeader("Content-Type", "image/png");
        return res.send(errorPngBuffer);
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

            const bioText = user.bio
                ? `"${user.bio.substring(0, 60)}${
                      user.bio.length > 60 ? "..." : ""
                  }"`
                : "";
            const enhancedDescription = `${
                bioText ? bioText + "\n" : ""
            }🚀 ${totalTimeFormatted}h coded | � ${
                user.currentStreak
            } day streak | 📈 ${user.longestStreak} best streak
💻 ${languagesList}${moreLanguages} | 📊 View full analytics on DisTrack`;

            // Generate a custom embed image URL (we'll create an endpoint for this)
            const embedImageUrl = `https://share.endpoint-system.uk/embed-image/${userId}?v=${Date.now()}`;

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
