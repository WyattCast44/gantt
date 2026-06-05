import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { wayfinder } from "@laravel/vite-plugin-wayfinder";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
        wayfinder(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
