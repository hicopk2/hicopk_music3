const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const db = require("../database");
const { requireAuth } = require("../middleware");

const uploadRoot = path.join(
    __dirname,
    "..",
    "..",
    "uploads"
);

const audioDirectory = path.join(
    uploadRoot,
    "audio"
);

const artworkDirectory = path.join(
    uploadRoot,
    "artwork"
);

fs.mkdirSync(audioDirectory, {
    recursive: true
});

fs.mkdirSync(artworkDirectory, {
    recursive: true
});


/*
|--------------------------------------------------------------------------
| Allowed file types
|--------------------------------------------------------------------------
*/

const audioTypes = new Set([
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/webm"
]);

const artworkTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);


/*
|--------------------------------------------------------------------------
| File naming
|--------------------------------------------------------------------------
*/

function createFilename(originalName) {
    const extension = path
        .extname(originalName)
        .toLowerCase();

    return `${crypto.randomUUID()}${extension}`;
}


/*
|--------------------------------------------------------------------------
| Storage
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
    destination: (req, file, callback) => {

        if (file.fieldname === "audio") {
            callback(null, audioDirectory);
            return;
        }

        if (file.fieldname === "artwork") {
            callback(null, artworkDirectory);
            return;
        }

        callback(
            new Error("Invalid upload field"),
            null
        );
    },

    filename: (req, file, callback) => {
        callback(
            null,
            createFilename(file.originalname)
        );
    }
});


/*
|--------------------------------------------------------------------------
| Upload validation
|--------------------------------------------------------------------------
*/

const upload = multer({

    storage,

    limits: {
        fileSize: 500 * 1024 * 1024,
        files: 2
    },

    fileFilter: (req, file, callback) => {

        if (file.fieldname === "audio") {

            if (!audioTypes.has(file.mimetype)) {
                return callback(
                    new Error(
                        "Unsupported audio format."
                    )
                );
            }

            return callback(null, true);
        }

        if (file.fieldname === "artwork") {

            if (!artworkTypes.has(file.mimetype)) {
                return callback(
                    new Error(
                        "Unsupported artwork format."
                    )
                );
            }

            return callback(null, true);
        }

        callback(
            new Error("Invalid upload field.")
        );
    }
});


/*
|--------------------------------------------------------------------------
| Upload endpoint
|--------------------------------------------------------------------------
*/

router.post(
    "/upload",

    requireAuth,

    upload.fields([
        {
            name: "audio",
            maxCount: 1
        },
        {
            name: "artwork",
            maxCount: 1
        }
    ]),

    (req, res) => {

        try {

            const audio =
                req.files?.audio?.[0];

            const artwork =
                req.files?.artwork?.[0];

            if (!audio) {

                return res.status(400).json({
                    error: "Audio file is required."
                });
            }


            const title =
                String(req.body.title || "")
                    .trim()
                    .slice(0, 150);

            if (!title) {

                fs.unlinkSync(audio.path);

                if (artwork) {
                    fs.unlinkSync(artwork.path);
                }

                return res.status(400).json({
                    error: "Track title is required."
                });
            }


            const artist =
                String(req.body.artist || "")
                    .trim()
                    .slice(0, 150);

            const description =
                String(req.body.description || "")
                    .slice(0, 5000);

            const genre =
                String(req.body.genre || "")
                    .slice(0, 100);

            const tags =
                String(req.body.tags || "")
                    .slice(0, 1000);

            const album =
                String(req.body.album || "")
                    .slice(0, 150);

            const lyrics =
                String(req.body.lyrics || "")
                    .slice(0, 50000);

            const releaseDate =
                req.body.release_date || null;

            const visibility =
                ["public", "unlisted", "private"]
                    .includes(req.body.visibility)
                    ? req.body.visibility
                    : "public";

            const explicit =
                req.body.explicit === "true" ||
                req.body.explicit === "1"
                    ? 1
                    : 0;


            const audioPath =
                `/uploads/audio/${audio.filename}`;

            const artworkPath =
                artwork
                    ? `/uploads/artwork/${artwork.filename}`
                    : null;


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

                title,
                artist,
                description,
                genre,
                tags,
                album,
                releaseDate,

                audioPath,
                artworkPath,

                lyrics,

                explicit,
                visibility
            );


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
            `).get(result.lastInsertRowid);


            res.status(201).json({
                success: true,
                track
            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            res.status(500).json({
                error: "Could not upload track."
            });
        }
    }
);


/*
|--------------------------------------------------------------------------
| Track list
|--------------------------------------------------------------------------
*/

router.get("/", (req, res) => {

    const tracks = db.prepare(`
        SELECT
            tracks.id,
            tracks.title,
            tracks.artist,
            tracks.description,
            tracks.genre,
            tracks.tags,
            tracks.album,
            tracks.release_date,
            tracks.audio_path,
            tracks.artwork_path,
            tracks.explicit,
            tracks.visibility,
            tracks.duration,
            tracks.plays,
            tracks.likes,
            tracks.reposts,
            tracks.created_at,

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


/*
|--------------------------------------------------------------------------
| Single track
|--------------------------------------------------------------------------
*/

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
            error: "Track not found."
        });
    }


    const owner =
        req.session?.userId === track.user_id;


    if (
        track.visibility !== "public" &&
        !owner
    ) {

        return res.status(404).json({
            error: "Track not found."
        });
    }


    res.json(track);
});


/*
|--------------------------------------------------------------------------
| Play counter
|--------------------------------------------------------------------------
*/

router.post("/:id/play", (req, res) => {

    const track = db.prepare(`
        SELECT id
        FROM tracks
        WHERE id = ?
        AND visibility = 'public'
    `).get(req.params.id);


    if (!track) {

        return res.status(404).json({
            error: "Track not found."
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


/*
|--------------------------------------------------------------------------
| Delete track
|--------------------------------------------------------------------------
*/

router.delete(
    "/:id",
    requireAuth,
    (req, res) => {

        const track = db.prepare(`
            SELECT *
            FROM tracks
            WHERE id = ?
        `).get(req.params.id);


        if (!track) {

            return res.status(404).json({
                error: "Track not found."
            });
        }


        if (
            track.user_id !==
            req.session.userId
        ) {

            return res.status(403).json({
                error: "You do not own this track."
            });
        }


        const audioFile =
            path.join(
                __dirname,
                "..",
                "..",
                track.audio_path
                    .replace("/uploads/", "uploads/")
            );


        const artworkFile =
            track.artwork_path
                ? path.join(
                    __dirname,
                    "..",
                    "..",
                    track.artwork_path
                        .replace(
                            "/uploads/",
                            "uploads/"
                        )
                )
                : null;


        db.prepare(`
            DELETE FROM tracks
            WHERE id = ?
        `).run(req.params.id);


        try {
            if (fs.existsSync(audioFile)) {
                fs.unlinkSync(audioFile);
            }

            if (
                artworkFile &&
                fs.existsSync(artworkFile)
            ) {
                fs.unlinkSync(artworkFile);
            }

        } catch (error) {
            console.error(
                "File cleanup error:",
                error
            );
        }


        res.json({
            success: true
        });
    }
);


/*
|--------------------------------------------------------------------------
| Upload error handler
|--------------------------------------------------------------------------
*/

router.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(413).json({
                    error:
                        "File is too large. Maximum size is 500MB."
                });
            }

            return res.status(400).json({
                error: error.message
            });
        }


        if (error) {

            return res.status(400).json({
                error: error.message
            });
        }


        next();
    }
);


module.exports = router;