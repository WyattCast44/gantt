<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\ProjectInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public ProjectInvitation $invitation) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You have been invited to '.$this->invitation->project->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.project-invitation',
            with: [
                'projectName' => $this->invitation->project->name,
                'roleLabel' => $this->invitation->role->label(),
                'invitedBy' => $this->invitation->inviter?->name,
                'acceptUrl' => route('invitations.show', $this->invitation->token),
            ],
        );
    }
}
