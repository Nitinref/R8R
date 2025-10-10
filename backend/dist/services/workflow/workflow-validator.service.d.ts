import type { WorkflowConfig } from '../../types/workflow.types.js';
interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateWorkflow(config: WorkflowConfig): ValidationResult;
export {};
//# sourceMappingURL=workflow-validator.service.d.ts.map