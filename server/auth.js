const express = require("express");
const router = express.Router();

const db = require("./database");

function generateUsername(base) {
    let username = String(base || "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 20);

    if (!username) {
        username = "user";
    }

    let finalUsername = username;
    let counter = 1;

    while (
        db.prepare(
            "SELECT id FROM users WHERE username = ?"
        ).get(finalUsername)
    ) {
        finalUsername = `${username}${counter}`;
        counter++;
    }

    return finalUsername;
}

router.get("/discord", (req, res) => {
    if (!process.env.DISCORD_CLIENT_ID) {
        return res.status(500).send(
            "Discord authentication has not been configured."
        );
    }

    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: "code",
        scope: "identify"
    });

    res.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`
    );
});

router.get("/discord/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send("Missing Discord authorization code.");
    }

    try {
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id: process.env.DISCORD_CLIENT_ID,
                    client_secret:
                        process.env.DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri:
                        process.env.DISCORD_REDIRECT_URI
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(tokenData);

            return res.status(401).send(
                "Discord authentication failed."
            );
        }

        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const discordUser = await userResponse.json();

        if (!userResponse.ok) {
            return res.status(401).send(
                "Could not retrieve Discord account."
            );
        }

        let user = db.prepare(
            "SELECT * FROM users WHERE discord_id = ?"
        ).get(discordUser.id);

        if (!user) {
            const username = generateUsername(
                discordUser.username
            );

            const displayName =
                discordUser.global_name ||
                discordUser.username ||
                username;

            const avatar = discordUser.avatar
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : null;

            const result = db.prepare(`
                INSERT INTO users (
                    discord_id,
                    username,
                    display_name,
                    avatar
                )
                VALUES (?, ?, ?, ?)
            `).run(
                discordUser.id,
                username,
                displayName,
                avatar
            );

            user = db.prepare(
                "SELECT * FROM users WHERE id = ?"
            ).get(result.lastInsertRowid);
        }

        if (user.is_banned) {
            return res.status(403).send(
                "This account has been suspended."
            );
        }

        req.session.userId = user.id;
        req.session.isAdmin = Boolean(user.is_admin);

        res.redirect("/app.html");

    } catch (error) {
        console.error("Discord OAuth error:", error);

        res.status(500).send(
            "Authentication server error."
        );
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            success: true
        });
    });
});

module.exports = router;