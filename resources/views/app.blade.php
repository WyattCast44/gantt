<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-theme-preference="{{ auth()->check() ? auth()->user()->theme->value : 'system' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Gantt') }}</title>

        <script>
            (function () {
                var root = document.documentElement;
                var pref = root.getAttribute('data-theme-preference') || 'system';
                var media = window.matchMedia('(prefers-color-scheme: dark)');
                function apply() {
                    if (pref === 'dark') {
                        root.classList.add('dark');
                    } else if (pref === 'light') {
                        root.classList.remove('dark');
                    } else {
                        root.classList.toggle('dark', media.matches);
                    }
                }
                apply();
                if (pref === 'system') {
                    media.addEventListener('change', apply);
                }
            })();
        </script>

        @viteReactRefresh
        @vite(['resources/js/app.tsx'])
        @inertiaHead
    </head>
<body class="font-sans antialiased select-none selection:bg-gray-200 selection:text-gray-900 dark:selection:bg-neutral-700 dark:selection:text-white">
        @inertia
    </body>
</html>
