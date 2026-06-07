<?php

declare(strict_types=1);

use App\Enums\RiskLevel;
use App\Enums\TaskStatus;
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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('start_date')->nullable();
            $table->unsignedInteger('duration_days')->default(1);
            // Manual dates are protected in V1 (no cascading propagation yet).
            $table->boolean('is_date_locked')->default(true);
            // Recursive depth, capped at five tiers (1-5).
            $table->unsignedTinyInteger('hierarchy_level')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status')->default(TaskStatus::NotStarted->value);
            $table->unsignedTinyInteger('percent_complete')->default(0);
            $table->string('risk_level')->default(RiskLevel::Low->value);
            $table->string('organization')->nullable();
            $table->json('tags')->nullable();
            $table->classification();
            $table->userStamps();
            $table->softDeletesWithUserStamps();
            $table->index(['project_id', 'parent_id']);
            $table->index(['project_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
