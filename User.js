const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true },
        // //
        username: { type: String, default: "Anonymous" },
        displayName: { type: String },
        avatarUrl: { type: String },
        linkedAt: { type: Date, default: Date.now },
        lastLinkedAt: { type: Date },
        // //
        isPublic: { type: Boolean, default: true },
        timezone: { type: String, default: "GMT+1" },
        bio: { type: String, default: "", maxlength: 500 },
        socials: { type: Object, default: {} },
        // //
        totalCodingTime: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        achievements: [
            {
                name: String,
                target: Number,
                description: String,
                category: String,
            },
        ],
        languages: {
            javascript: { type: Number, default: 0 },
            html: { type: Number, default: 0 },
            css: { type: Number, default: 0 },
            python: { type: Number, default: 0 },
            c: { type: Number, default: 0 },
            cpp: { type: Number, default: 0 },
            csharp: { type: Number, default: 0 },
            dart: { type: Number, default: 0 },
            go: { type: Number, default: 0 },
            json: { type: Number, default: 0 },
            kotlin: { type: Number, default: 0 },
            matlab: { type: Number, default: 0 },
            perl: { type: Number, default: 0 },
            php: { type: Number, default: 0 },
            r: { type: Number, default: 0 },
            ruby: { type: Number, default: 0 },
            rust: { type: Number, default: 0 },
            scala: { type: Number, default: 0 },
            sql: { type: Number, default: 0 },
            swift: { type: Number, default: 0 },
            typescript: { type: Number, default: 0 },
            markdown: { type: Number, default: 0 },
            properties: { type: Number, default: 0 },
            yaml: { type: Number, default: 0 },
            xml: { type: Number, default: 0 },
            other: { type: Number, default: 0 }, // Catch-all for any other
        },
        lastSessionDate: { type: Date, default: null }, // New field to track last coding session date
        archived: { type: Boolean, default: false }, // New field for archiving inactive users
        archivedAt: { type: Date, default: null }, // New field to track when user was archived
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt fields
    }
);

module.exports = mongoose.model("User", userSchema);
