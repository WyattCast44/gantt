import Button from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { accept as acceptInvitation, decline as declineInvitation } from '@/routes/invitations';
import { router } from '@inertiajs/react';

type InvitationShowProps = {
    invitation: {
        id: number;
        email: string;
        role: { value: string; label: string };
        project: { name: string };
        invited_by: string | null;
        is_actionable: boolean;
        can_respond: boolean;
    };
};

export default function Show({ invitation }: InvitationShowProps) {
    const { project, role, invited_by, is_actionable, can_respond, email } = invitation;

    return (
        <AuthLayout
            title={`Join ${project.name}`}
            description={`${invited_by ? `${invited_by} invited you` : 'You have been invited'} as ${role.label}.`}
        >
            {!is_actionable ? (
                <p className="text-sm text-slate-600 dark:text-neutral-300">
                    This invitation is no longer available. Ask an admin to send a new one.
                </p>
            ) : !can_respond ? (
                <p className="text-sm text-slate-600 dark:text-neutral-300">
                    This invitation is for <span className="font-medium">{email}</span>. Sign in as that user to
                    respond.
                </p>
            ) : (
                <div className="flex gap-2">
                    <Button onClick={() => router.post(acceptInvitation.url(invitation.id))} className="flex-1">
                        Accept invitation
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => router.post(declineInvitation.url(invitation.id))}
                        className="flex-1"
                    >
                        Decline
                    </Button>
                </div>
            )}
        </AuthLayout>
    );
}
