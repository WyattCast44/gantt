import Modal from '@/components/ui/modal';
import EditDocumentForm from '@/Pages/Documents/Partials/EditDocumentForm';
import { CLASSIFICATIONS, type Document, type Project } from '@/types';

type EditDocumentModalProps = {
    project: Project;
    document: Document;
    onClose: () => void;
    options: typeof CLASSIFICATIONS;
};

export default function EditDocumentModal({ project, document, onClose, options }: EditDocumentModalProps) {
    return (
        <Modal open onClose={onClose} title="Edit document">
            <div className="mt-2">
                <EditDocumentForm project={project} document={document} options={options} onSuccess={onClose} onCancel={onClose} />
            </div>
        </Modal>
    );
}
