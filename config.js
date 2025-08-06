require("dotenv").config();

module.exports = {
    API_KEY: process.env.API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET || "your-session-secret-key",
    PORT: process.env.PORT || 8081,
};
