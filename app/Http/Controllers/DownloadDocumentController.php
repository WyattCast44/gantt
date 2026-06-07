<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ActivityAction;
use App\Models\Document;
use App\Models\Project;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadDocumentController
{
    /**
     * Stream a document download to any project member. Membership is enforced
     * by the `project.member` middleware; file I/O lives on the model so the
     * controller stays within the architecture allowlist, and the private disk
     * never exposes a public URL. The download is audited here, at the HTTP
     * boundary where the user action actually occurs, so the model's file-I/O
     * method stays free of request-scoped side effects.
     */
    public function __invoke(Project $project, Document $document): StreamedResponse
    {
        $document->logAction(ActivityAction::Downloaded);

        return $document->download();
    }
}
