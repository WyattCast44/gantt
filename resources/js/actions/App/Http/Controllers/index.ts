import ProjectController from './ProjectController'
import RestoreProjectController from './RestoreProjectController'
import ProjectSettingsController from './ProjectSettingsController'
import ProjectMemberController from './ProjectMemberController'
import ProjectInvitationController from './ProjectInvitationController'
import DocumentController from './DocumentController'
import DownloadDocumentController from './DownloadDocumentController'
import PreviewDocumentController from './PreviewDocumentController'
import CommentController from './CommentController'
import InvitationController from './InvitationController'
import AcceptInvitationController from './AcceptInvitationController'
import DeclineInvitationController from './DeclineInvitationController'
import SidebarCollapsedController from './SidebarCollapsedController'
import SidebarWidthController from './SidebarWidthController'

const Controllers = {
    ProjectController: Object.assign(ProjectController, ProjectController),
    RestoreProjectController: Object.assign(RestoreProjectController, RestoreProjectController),
    ProjectSettingsController: Object.assign(ProjectSettingsController, ProjectSettingsController),
    ProjectMemberController: Object.assign(ProjectMemberController, ProjectMemberController),
    ProjectInvitationController: Object.assign(ProjectInvitationController, ProjectInvitationController),
    DocumentController: Object.assign(DocumentController, DocumentController),
    DownloadDocumentController: Object.assign(DownloadDocumentController, DownloadDocumentController),
    PreviewDocumentController: Object.assign(PreviewDocumentController, PreviewDocumentController),
    CommentController: Object.assign(CommentController, CommentController),
    InvitationController: Object.assign(InvitationController, InvitationController),
    AcceptInvitationController: Object.assign(AcceptInvitationController, AcceptInvitationController),
    DeclineInvitationController: Object.assign(DeclineInvitationController, DeclineInvitationController),
    SidebarCollapsedController: Object.assign(SidebarCollapsedController, SidebarCollapsedController),
    SidebarWidthController: Object.assign(SidebarWidthController, SidebarWidthController),
}

export default Controllers