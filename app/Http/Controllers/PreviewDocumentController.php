<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Project;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PreviewDocumentController
{
    /**
     * Stream a document inline for in-browser preview. Membership is enforced
     * by the `project.member` middleware; file I/O lives on the model so the
     * controller stays within the architecture allowlist, and the private disk
     * never exposes a public URL.
     */
    public function __invoke(Project $project, Document $document): StreamedResponse
    {
        return $document->inline();
    }
}
