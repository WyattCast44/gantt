<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // A plain self-referencing pivot (no Eloquent model, like project_user):
        // finish-to-start edges from predecessor -> successor, supporting
        // multiple predecessors per task (FR-3). Propagation is deferred (V1).
        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('predecessor_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('successor_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('type')->default('finish_to_start');
            $table->userStamps();
            $table->softDeletesWithUserStamps();
            $table->unique(['predecessor_id', 'successor_id']);
            $table->index('successor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_dependencies');
    }
};
