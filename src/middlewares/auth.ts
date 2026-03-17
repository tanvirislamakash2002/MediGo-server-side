
import { NextFunction, Request, Response } from 'express';
import { Role } from '../../generated/prisma/enums';
import { auth as betterAuth } from '../lib/auth'
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: Role;
                emailVerified: boolean
            }
        }
    }
}

const auth = (...roles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // get user session
            const session = await betterAuth.api.getSession({
                headers: req.headers as any
            });
            if (!session) {
                return res.status(401).json({
                    success: false,
                    message: "You are not authorized!"
                })
            }
            if (!session.user.emailVerified) {
                return res.status(403).json({
                    success: false,
                    message: "Email Verification required. Please verify your email!"
                })
            }
            req.user = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role as Role,
                emailVerified: session.user.emailVerified
            }
            if (roles.length && !roles.includes(req.user.role as Role)) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden! You don't have permission to access this resources"
                })
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}

export default auth;