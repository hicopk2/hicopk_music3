const express = require("express");
const router = express.Router();

const db = require("../database");
const { requireAuth } = require("../middleware");

router.get("/", (req, res) => {
    const tracks = db.prepare(`
        SELECT
            tracks.*,

            users.username,
            users.display_name,
            users.avatar

        FROM tracks

        JOIN users
            ON users.id = tracks.user_id

        WHERE tracks.visibility = 'public'

        ORDER BY tracks.created_at DESC

        LIMIT 50
    `).all();

    res.json(tracks);
});

router.get("/:id", (req, res) => {
    const track = db.prepare(`
        SELECT
            tracks.*,

            users.username,
            users.display_name,
            users.avatar

        FROM tracks

        JOIN users
            ON users.id = tracks.user_id

        WHERE tracks.id = ?
    `).get(req.params.id);

    if (!track) {
        return res.status(404).json({
            error: "Track not found"
        });
    }

    if (
        track.visibility !== "public" &&
        (!req.session ||
        req.session.userId !== track.user_id)
    ) {
        return res.status(404).json({
            error: "Track not found"
        });
    }

    res.json(track);
});

router.post("/", requireAuth, (req, res) => {
    const {
        title,
        artist,
        description,
        genre,
        tags,
        album,
        release_date,
        audio_path,
        artwork_path,
        lyrics,
        explicit,
        visibility
    } = req.body;

    if (!title || !audio_path) {
        return res.status(400).json({
            error: "Title and audio file are required"
        });
    }

    const result = db.prepare(`
        INSERT INTO tracks (
            user_id,
            title,
            artist,
            description,
            genre,
            tags,
            album,
            release_date,
            audio_path,
            artwork_path,
            lyrics,
            explicit,
            visibility
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.session.userId,
        String(title).slice(0, 150),
        String(artist || "").slice(0, 150),
        String(description || "").slice(0, 5000),
        String(genre || "").slice(0, 100),
        String(tags || "").slice(0, 1000),
        String(album || "").slice(0, 150),
        release_date || null,
        audio_path,
        artwork_path || null,
        String(lyrics || "").slice(0, 50000),
        explicit ? 1 : 0,
        ["public", "unlisted", "private"].includes(visibility)
            ? visibility
            : "public"
    );

    res.status(201).json({
        success: true,
        trackId: result.lastInsertRowid
    });
});

router.post("/:id/play", (req, res) => {
    const track = db.prepare(
        "SELECT id FROM tracks WHERE id = ? AND visibility = 'public'"
    ).get(req.params.id);

    if (!track) {
        return res.status(404).json({
            error: "Track not found"
        });
    }

    db.prepare(`
        UPDATE tracks
        SET plays = plays + 1
        WHERE id = ?
    `).run(req.params.id);

    db.prepare(`
        INSERT INTO analytics (
            track_id,
            event_type,
            user_id
        )
        VALUES (?, 'play', ?)
    `).run(
        req.params.id,
        req.session?.userId || null
    );

    res.json({
        success: true
    });
});

module.exports = router;