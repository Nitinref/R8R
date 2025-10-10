import { StepType } from '../../types/workflow.types.js';
export function validateWorkflow(config) {
    const errors = [];
    if (!config.name || config.name.trim().length === 0) {
        errors.push('Workflow name is required');
    }
    if (!config.steps || config.steps.length === 0) {
        errors.push('Workflow must have at least one step');
    }
    // Validate each step
    const stepIds = new Set();
    for (const step of config.steps || []) {
        if (!step.id) {
            errors.push('Each step must have an id');
            continue;
        }
        if (stepIds.has(step.id)) {
            errors.push(`Duplicate step id: ${step.id}`);
        }
        stepIds.add(step.id);
        // @ts-ignore
        if (!step.type || !Object.values(StepType).includes(step.type)) {
            errors.push(`Invalid step type for step ${step.id}`);
        }
        // Validate step-specific requirements
        // @ts-ignore
        if ([StepType.QUERY_REWRITE, StepType.RERANK, StepType.ANSWER_GENERATION].includes(step.type)) {
            if (!step.config.llm) {
                errors.push(`Step ${step.id} requires LLM configuration`);
            }
        }
        if (step.type === StepType.RETRIEVAL) {
            if (!step.config.retriever) {
                errors.push(`Step ${step.id} requires retriever configuration`);
            }
        }
    }
    // Validate step connections
    for (const step of config.steps || []) {
        if (step.nextSteps) {
            for (const nextStepId of step.nextSteps) {
                if (!stepIds.has(nextStepId)) {
                    errors.push(`Step ${step.id} references non-existent next step: ${nextStepId}`);
                }
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=workflow-validator.service.js.map