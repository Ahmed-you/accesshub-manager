<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_is_not_available()
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(404);
    }

    public function test_reset_password_link_can_not_be_requested()
    {
        $this->post('/forgot-password', ['email' => 'admin@example.com'])
            ->assertStatus(404);
    }

    public function test_reset_password_screen_is_not_available()
    {
        $this->get('/reset-password/token')->assertStatus(404);
    }

    public function test_password_can_not_be_reset_publicly()
    {
        $this->post('/reset-password', [
            'token' => 'token',
            'email' => 'admin@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(404);
    }
}
