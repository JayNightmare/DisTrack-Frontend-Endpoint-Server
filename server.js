const express = require("express");
const path = require("path");
const sharp = require("sharp");
const app = express();
const fs = require("fs").promises;
const User = require("./User.js");
const { connectToDatabase } = require("./database.js");
const axios = require("axios");
const { API_KEY, PORT } = require("./config.js");
const { getLeaderboardPosition } = require("./utils/leaderboard.js");

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

        // Choose template based on premium status
        const templateFile = "Free User.svg"; // TODO: Refactor `Paid User.svg`. Once refactored, add conditional logic here
        const templatePath = path.join(__dirname, "svg", templateFile);

        // Read SVG template as text for dynamic injection
        let svgString = (await fs.readFile(templatePath)).toString("utf-8");

        // Helper: escape XML special chars in text nodes/attributes
        const xmlEscape = (str) =>
            String(str ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");

        // Compute dynamic values
        const displayName = (
            user.displayName ||
            user.username ||
            "User"
        ).toString();
        const username = (user.username || "").toString();
        const totalHours = Math.max(
            0,
            Math.floor((user.totalCodingTime || 0) / 3600)
        );
        const currentStreak = user.currentStreak || 0;
        const longestStreak = user.longestStreak || 0;
        const profileUrl = `https://distrack.endpoint-system.uk/user/${userId}`;
        const footerText = "Start Tracking Today — distrack.endpoint-system.uk";
        const languages = user.languages || {};
        const topLanguages = Object.entries(languages)
            .sort(([, a], [, b]) => (b || 0) - (a || 0))
            .slice(0, 3)
            .map(([l]) => l)
            .join(" • ");
        const langCount = Object.keys(languages).length;

        let avatarDataUrl = "";
        if (svgString.includes("{{AVATAR_DATA_URL}}")) {
            const avatarUrl =
                user.avatarUrl || "https://avatar.iran.liara.run/public";
            try {
                const avatarResponse = await axios.get(avatarUrl, {
                    responseType: "arraybuffer",
                    timeout: 5000,
                    headers: { "User-Agent": "DisTrack-Bot/1.0" },
                });
                const contentType =
                    avatarResponse.headers["content-type"] || "image/jpeg";
                const base64 = Buffer.from(
                    avatarResponse.data,
                    "binary"
                ).toString("base64");
                avatarDataUrl = `data:${contentType};base64,${base64}`;
            } catch (e) {
                // 1x1 transparent PNG fallback
                avatarDataUrl =
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAkMB9n3y5oQAAAAASUVORK5CYII=";
            }
        }

        // Check position on the leaderboard (based on total hours)
        const leaderboardPosition = await getLeaderboardPosition(userId);
        console.log(
            `User ${userId} is ranked #${leaderboardPosition} on the leaderboard`
        );

        // Perform placeholder replacements (no-op if token not present in template)
        const replacements = {
            "{{DISPLAY_NAME}}": xmlEscape(displayName),
            "{{USERNAME}}": xmlEscape(username),
            "{{TOTAL_HOURS}}": xmlEscape(`${totalHours}h`),
            "{{CURRENT_STREAK}}": xmlEscape(String(currentStreak)),
            "{{LONGEST_STREAK}}": xmlEscape(String(longestStreak)),
            "{{URL}}": xmlEscape(profileUrl),
            "{{FOOTER}}": xmlEscape(footerText),
            "{{TOP_LANGUAGES}}": xmlEscape(topLanguages),
            "{{LANG_COUNT}}": xmlEscape(String(langCount)),
            "{{AUTHOR}}": xmlEscape("DisTrack - Code Tracking Tool"),
            "{{AVATAR_DATA_URL}}": avatarDataUrl,
            "{{RANKING}}": xmlEscape(leaderboardPosition),
        };

        for (const [token, value] of Object.entries(replacements)) {
            if (svgString.includes(token)) {
                // Replace all occurrences of the token
                svgString = svgString.split(token).join(value);
            }
        }

        const pngBuffer = await sharp(Buffer.from(svgString, "utf-8"))
            .png()
            .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
        return res.send(pngBuffer);
    } catch (error) {
        console.error("Error generating embed image:", error);

        // Fallback to a simple error image
        const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#667eea"/>
    <text x="600" y="315" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">DisTrack</text>
    <text x="600" y="360" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">Start Tracking Today — distrack.endpoint-system.uk</text>
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
            // Return HTML with Open Graph and Twitter Card meta tags (per new requirements)
            const displayName = user.displayName || user.username;
            const profileUrl = `https://distrack.endpoint-system.uk/user/${userId}`;
            const embedImageUrl = `${req.protocol}://${req.get(
                "host"
            )}/embed-image/${userId}?v=${Date.now()}`;
            const authorText = "DisTrack - Code Tracking Tool";
            const footerText =
                "Start Tracking Today — https://distrack.endpoint-system.uk";

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayName}'s Profile</title>
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${displayName}'s Profile">
    <meta property="og:description" content="${footerText}">
    <meta property="og:image" content="${embedImageUrl}">
    <meta property="og:image:alt" content="DisTrack Profile Preview">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${profileUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${authorText}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${displayName}'s Profile">
    <meta name="twitter:description" content="${footerText}">
    <meta name="twitter:image" content="${embedImageUrl}">
    <meta name="twitter:image:alt" content="DisTrack Profile Preview">
    
    <!-- Discord-specific enhancements -->
    <meta name="theme-color" content="#667eea">
    <meta property="og:color" content="#667eea">
    
    <!-- Additional Meta Tags -->
    <meta name="description" content="${footerText}">
    <meta name="author" content="${authorText}">
    
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
    .cta { margin-top: 1rem; font-size: 0.95rem; opacity: 0.9; }
    a { color: #fff; }
    </style>
</head>
<body>
    <div class="profile-card">
    <h1>${displayName}'s Profile</h1>
    <p class="cta">Start Tracking Today — <a href="https://distrack.endpoint-system.uk" target="_blank" rel="noopener">distrack.endpoint-system.uk</a></p>
    </div>
    
    <script>
        // Redirect to full app after a delay for human visitors
        setTimeout(() => {
            if (navigator.userAgent.indexOf('bot') === -1) {
        window.location.href = '${profileUrl}';
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
