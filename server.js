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

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.displayName || user.username} - DisTrack Profile</title>
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${
        user.displayName || user.username
    } - DisTrack Profile">
    <meta property="og:description" content="🚀 ${totalTimeFormatted}h coded | 🔥 ${
                user.currentStreak
            } day streak | 📈 ${user.longestStreak} longest streak">
    <meta property="og:image" content="${avatarUrl}">
    <meta property="og:url" content="https://distrack.endpoint-system.uk/user/${userId}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="DisTrack">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${
        user.displayName || user.username
    } - DisTrack Profile">
    <meta name="twitter:description" content="🚀 ${totalTimeFormatted}h coded | 🔥 ${
                user.currentStreak
            } day streak | 📈 ${user.longestStreak} longest streak">
    <meta name="twitter:image" content="${avatarUrl}">
    
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
