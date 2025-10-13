import type { Request, Response } from 'express';
export declare const createWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const listWorkflows: (req: Request, res: Response) => Promise<void>;
export declare const getWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const updateWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const deleteWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const cloneWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const activateWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const deactivateWorkflow: (req: Request, res: Response) => Promise<void>;
export declare const getWorkflowStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=workflow.controller.d.ts.map