import { useWorkflowCommentStore, type WorkflowComment } from "@/stores/workflowEditorCommentStore";
import { type ConnectionOutputLink, type Steps, useWorkflowStepStore } from "@/stores/workflowStepStore";

interface Workflow {
    name: string;
    annotation: string;
    license: string;
    creator: any;
    version: number;
    report: any;
    steps: Steps;
    comments: WorkflowComment[];
    tags: string[];
}

/**
 * Loads a workflow into the editor
 *
 * @param id ID of workflow to load data *into*
 * @param data Workflow data to load from
 * @param appendData if true appends data to current workflow, making sure to create new uuids
 * @param defaultPosition where to position workflow in the editor
 */
export async function fromSimple(
    id: string,
    data: Workflow,
    appendData = false,
    defaultPosition = { top: 0, left: 0 }
) {
    const stepStore = useWorkflowStepStore(id);
    const commentStore = useWorkflowCommentStore(id);

    // If workflow being copied into another, wipe UUID and let
    // Galaxy assign new ones.
    if (appendData) {
        const stepIdOffset = stepStore.getStepIndex + 1;

        Object.values(data.steps).forEach((step) => {
            delete step.uuid;
            if (!step.position) {
                // Should only happen for manually authored editor content,
                // good enough for a first pass IMO.
                step.position = { top: step.id * 100, left: step.id * 100 };
            }
            step.id += stepIdOffset;
            step.position.left += defaultPosition.left;
            step.position.top += defaultPosition.top;
            Object.values(step.input_connections).forEach((link) => {
                if (link === undefined) {
                    console.error("input connections invalid", step.input_connections);
                } else {
                    let linkArray: ConnectionOutputLink[];
                    if (!Array.isArray(link)) {
                        linkArray = [link];
                    } else {
                        linkArray = link;
                    }
                    linkArray.forEach((link) => {
                        link.id += stepIdOffset;
                    });
                }
            });
        });

        data.comments.forEach((comment, index) => {
            comment.id = commentStore.highestCommentId + 1 + index;
        });
    }

    Object.values(data.steps).map((step) => {
        stepStore.addStep(step);
    });

    commentStore.addComments(data.comments, [defaultPosition.left, defaultPosition.top]);
}

export function toSimple(id: string, workflow: Workflow): Omit<Workflow, "version"> {
    const steps = workflow.steps;
    const report = workflow.report;
    const license = workflow.license;
    const creator = workflow.creator;
    const annotation = workflow.annotation;
    const name = workflow.name;
    const tags = workflow.tags;

    const commentStore = useWorkflowCommentStore(id);
    commentStore.resolveCommentsInFrames();
    commentStore.resolveStepsInFrames();

    const comments = workflow.comments.filter((comment) => !(comment.type === "text" && comment.data.text === ""));

    return { steps, report, license, creator, annotation, name, comments, tags };
}
