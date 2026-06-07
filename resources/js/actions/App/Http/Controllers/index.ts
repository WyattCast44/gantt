import ProjectController from './ProjectController'
import RestoreProjectController from './RestoreProjectController'
import ProjectSettingsController from './ProjectSettingsController'
import ProjectMemberController from './ProjectMemberController'
import ProjectInvitationController from './ProjectInvitationController'
import DocumentController from './DocumentController'
import DownloadDocumentController from './DownloadDocumentController'
import PreviewDocumentController from './PreviewDocumentController'
import CommentController from './CommentController'
import TaskController from './TaskController'
import CompleteTaskController from './CompleteTaskController'
import TaskCommentController from './TaskCommentController'
import TaskDependencyController from './TaskDependencyController'
import TaskDocumentController from './TaskDocumentController'
import UploadTaskDocumentController from './UploadTaskDocumentController'
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
    TaskController: Object.assign(TaskController, TaskController),
    CompleteTaskController: Object.assign(CompleteTaskController, CompleteTaskController),
    TaskCommentController: Object.assign(TaskCommentController, TaskCommentController),
    TaskDependencyController: Object.assign(TaskDependencyController, TaskDependencyController),
    TaskDocumentController: Object.assign(TaskDocumentController, TaskDocumentController),
    UploadTaskDocumentController: Object.assign(UploadTaskDocumentController, UploadTaskDocumentController),
    InvitationController: Object.assign(InvitationController, InvitationController),
    AcceptInvitationController: Object.assign(AcceptInvitationController, AcceptInvitationController),
    DeclineInvitationController: Object.assign(DeclineInvitationController, DeclineInvitationController),
    SidebarCollapsedController: Object.assign(SidebarCollapsedController, SidebarCollapsedController),
    SidebarWidthController: Object.assign(SidebarWidthController, SidebarWidthController),
}

export default Controllers