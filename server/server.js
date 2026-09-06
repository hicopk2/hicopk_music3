require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const db = require("./database");

const authRoutes = require("./auth");
const userRoutes = require("./routes/users");
const trackRoutes = require("./routes/tracks");

const app = express();

const PORT = process.env.PORT || 3000;

const uploadsDirectory = path.join(
    __dirname,
    "..",
    "uploads"
);

const audioDirectory = path.join(
    uploadsDirectory,
    "audio"
);

const artworkDirectory = path.join(
    uploadsDirectory,
    "artwork"
);

fs.mkdirSync(audioDirectory, {
    recursive: true
});

fs.mkdirSync(artworkDirectory, {
    recursive: true
});

app.set("trust proxy", 1);

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "2mb"
    })
);

app.use(cookieParser());

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "development-secret-change-me",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 30
        }
    })
);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,

    standardHeaders: true,
    legacyHeaders: false
});

app.use("/api", apiLimiter);

app.use(
    express.static(
        path.join(__dirname, "..", "public")
    )
);

app.use(
    "/uploads",
    express.static(uploadsDirectory, {
        fallthrough: false
    })
);

app.use("/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/tracks", trackRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        name: "Hicopk Music API",
        version: "1.0.0"
    });
});

app.get("/api/session", (req, res) => {
    if (!req.session.userId) {
        return res.json({
            authenticated: false
        });
    }

    const user = db.prepare(`
        SELECT
            id,
            username,
            display_name,
            avatar,
            is_admin
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.json({
            authenticated: false
        });
    }

    res.json({
        authenticated: true,
        user
    });
});

app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            error: "API endpoint not found"
        });
    }

    res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log("");
    console.log("================================");
    console.log("       HICOPK MUSIC");
    console.log("================================");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`API:    http://localhost:${PORT}/api/health`);
    console.log("================================");
    console.log("");
});