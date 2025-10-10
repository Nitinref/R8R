import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';
export const authenticateJWT = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
export const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ error: 'No API key provided' });
        }
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey, isActive: true },
            include: { user: true }
        });
        if (!keyRecord) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Update last used timestamp
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() }
        });
        req.user = {
            userId: keyRecord.userId,
            email: keyRecord.user.email
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
//# sourceMappingURL=auth.middleware.js.map