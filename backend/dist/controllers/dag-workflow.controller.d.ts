import type { Request, Response } from 'express';
export declare class DAGWorkflowController {
    private executor;
    constructor();
    createWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getWorkflows(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    executeWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getWorkflowRun(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getWorkflowRuns(req: Request, res: Response): Promise<void>;
    createExampleWorkflow(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateWorkflow(req: Request, res: Response): Promise<void>;
    deleteWorkflow(req: Request, res: Response): Promise<void>;
    createNode(req: Request, res: Response): Promise<void>;
    updateNode(req: Request, res: Response): Promise<void>;
    deleteNode(req: Request, res: Response): Promise<void>;
    createConnection(req: Request, res: Response): Promise<void>;
    deleteConnection(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=dag-workflow.controller.d.ts.map