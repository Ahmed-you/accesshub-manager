<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_verification_screen_is_not_available()
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->get('/verify-email');

        $response->assertStatus(404);
    }

    public function test_email_verification_route_is_not_available()
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get('/verify-email/1/hash')
            ->assertStatus(404);
    }
}
