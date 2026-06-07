import CommentsThread from '@/components/comments-section';
import { destroy as commentDestroy, store as commentStore, update as commentUpdate } from '@/routes/projects/documents/comments';
import { CLASSIFICATIONS, type Document, type Project } from '@/types';

type CommentsSectionProps = {
    project: Project;
    document: Document;
    /** Classification options capped at the project baseline. */
    options: typeof CLASSIFICATIONS;
};

/**
 * The document comment thread — a thin wrapper that wires the shared
 * CommentsThread to the document comment routes.
 */
export default function CommentsSection({ project, document, options }: CommentsSectionProps) {
    return (
        <CommentsThread
            comments={document.comments}
            canComment={project.can.update}
            options={options}
            storeUrl={commentStore.url([project.id, document.id])}
            buildUpdateUrl={(commentId) => commentUpdate.url([project.id, document.id, commentId])}
            buildDestroyUrl={(commentId) => commentDestroy.url([project.id, document.id, commentId])}
        />
    );
}
