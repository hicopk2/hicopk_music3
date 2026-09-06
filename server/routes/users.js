const express = require("express");
const router = express.Router();

const db = require("../database");
const { requireAuth } = require("../middleware");

router.get("/me", requireAuth, (req, res) => {
    const user = db.prepare(`
        SELECT
            id,
            username,
            display_name,
            avatar,
            banner,
            bio,
            location,
            website,
            profile_color,
            background,
            favorite_genres,
            favorite_artists,
            created_at
        FROM users
        WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        });
    }

    res.json(user);
});

router.get("/:username", (req, res) => {
    const user = db.prepare(`
        SELECT
            id,
            username,
            display_name,
            avatar,
            banner,
            bio,
            location,
            website,
            profile_color,
            background,
            favorite_genres,
            favorite_artists,
            created_at
        FROM users
        WHERE username = ?
    `).get(req.params.username);

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        });
    }

    res.json(user);
});

router.patch("/me", requireAuth, (req, res) => {
    const allowed = [
        "display_name",
        "bio",
        "location",
        "website",
        "profile_color",
        "background",
        "favorite_genres",
        "favorite_artists"
    ];

    const updates = [];
    const values = [];

    for (const field of allowed) {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(String(req.body[field]).slice(0, 500));
        }
    }

    if (!updates.length) {
        return res.status(400).json({
            error: "No changes provided"
        });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    values.push(req.session.userId);

    db.prepare(`
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = ?
    `).run(...values);

    res.json({
        success: true
    });
});

router.delete("/me", requireAuth, (req, res) => {
    db.prepare(
        "DELETE FROM users WHERE id = ?"
    ).run(req.session.userId);

    req.session.destroy(() => {
        res.json({
            success: true
        });
    });
});

module.exports = router;