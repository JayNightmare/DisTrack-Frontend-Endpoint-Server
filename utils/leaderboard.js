const User = require("../User.js");

async function getLeaderboardPosition(userId) {
    const users = await User.find().sort({ totalCodingTime: -1 });
    const position = users.findIndex((user) => user.userId === userId);
    return position !== -1 ? position + 1 : null;
}

module.exports = { getLeaderboardPosition };
