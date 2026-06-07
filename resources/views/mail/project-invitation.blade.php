<x-mail::message>
# You're invited to {{ $projectName }}

@if ($invitedBy)
{{ $invitedBy }} has invited you to collaborate on **{{ $projectName }}** as **{{ $roleLabel }}**.
@else
You have been invited to collaborate on **{{ $projectName }}** as **{{ $roleLabel }}**.
@endif

<x-mail::button :url="$acceptUrl">
View invitation
</x-mail::button>

If you weren't expecting this invitation, you can safely ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
