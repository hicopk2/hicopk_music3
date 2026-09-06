const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
}

const db = new Database(path.join(dataDirectory, "hicopk-music.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    discord_id TEXT UNIQUE NOT NULL,

    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,

    avatar TEXT,
    banner TEXT,

    bio TEXT,
    location TEXT,
    website TEXT,

    profile_color TEXT DEFAULT '#ff1e1e',
    background TEXT,

    favorite_genres TEXT,
    favorite_artists TEXT,

    is_admin INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    artist TEXT,

    description TEXT,

    genre TEXT,
    tags TEXT,
    album TEXT,

    release_date TEXT,

    audio_path TEXT NOT NULL,
    artwork_path TEXT,

    lyrics TEXT,

    explicit INTEGER DEFAULT 0,

    visibility TEXT DEFAULT 'public',

    duration INTEGER DEFAULT 0,

    plays INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    reposts INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    artwork_path TEXT,

    release_date TEXT,
    genre TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,

    cover_path TEXT,

    visibility TEXT DEFAULT 'public',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,

    position INTEGER DEFAULT 0,

    PRIMARY KEY(playlist_id, track_id),

    FOREIGN KEY(playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, track_id),

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reposts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, track_id),

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,

    parent_id INTEGER,

    body TEXT NOT NULL,

    timestamp_seconds INTEGER,

    likes INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    FOREIGN KEY(parent_id)
        REFERENCES comments(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(follower_id, following_id),

    FOREIGN KEY(follower_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(following_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    type TEXT NOT NULL,

    actor_id INTEGER,

    track_id INTEGER,

    comment_id INTEGER,

    message TEXT,

    is_read INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(actor_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    FOREIGN KEY(comment_id)
        REFERENCES comments(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    reporter_id INTEGER NOT NULL,

    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,

    reason TEXT NOT NULL,
    description TEXT,

    status TEXT DEFAULT 'pending',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(reporter_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    track_id INTEGER NOT NULL,

    event_type TEXT NOT NULL,

    user_id INTEGER,

    ip_hash TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(track_id)
        REFERENCES tracks(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);
`);

module.exports = db;