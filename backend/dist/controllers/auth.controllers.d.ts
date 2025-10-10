import type { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const createApiKey: (req: Request, res: Response) => Promise<void>;
export declare const listApiKeys: (req: Request, res: Response) => Promise<void>;
export declare const deleteApiKey: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controllers.d.ts.map