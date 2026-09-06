function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    if (!req.session.isAdmin) {
        return res.status(403).json({
            error: "Administrator access required"
        });
    }

    next();
}

function requireOwnership(getOwnerId) {
    return (req, res, next) => {
        try {
            const ownerId = getOwnerId(req);

            if (Number(ownerId) !== Number(req.session.userId)) {
                return res.status(403).json({
                    error: "You do not own this resource"
                });
            }

            next();
        } catch {
            return res.status(403).json({
                error: "Ownership check failed"
            });
        }
    };
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireOwnership
};