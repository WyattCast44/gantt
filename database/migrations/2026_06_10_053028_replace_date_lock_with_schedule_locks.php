<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replace the single is_date_locked boolean with the target locking model
     * (PRD §4): independent locks on start, end, and duration, at most two of
     * three. Backfill preserves V1 semantics — a date-locked task becomes
     * fully pinned (start + duration), an unlocked task keeps only its
     * duration fixed so the rules engine may slide it.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->boolean('lock_start')->default(false)->after('duration_unit');
            $table->boolean('lock_end')->default(false)->after('lock_start');
            $table->boolean('lock_duration')->default(true)->after('lock_end');
        });

        DB::table('tasks')->update([
            'lock_start' => DB::raw('is_date_locked'),
            'lock_duration' => true,
        ]);

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('is_date_locked');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->boolean('is_date_locked')->default(true)->after('duration_unit');
        });

        DB::table('tasks')->update(['is_date_locked' => DB::raw('lock_start')]);

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['lock_start', 'lock_end', 'lock_duration']);
        });
    }
};
