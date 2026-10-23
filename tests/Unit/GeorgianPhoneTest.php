<?php

namespace Tests\Unit;

use App\Support\GeorgianPhone;
use PHPUnit\Framework\TestCase;

class GeorgianPhoneTest extends TestCase
{
    public function test_normalize_accepts_country_code_without_plus(): void
    {
        $this->assertSame('+995555000001', GeorgianPhone::normalize('995555000001'));
        $this->assertSame('+995555000001', GeorgianPhone::normalize('+995555000001'));
        $this->assertSame('+995555000001', GeorgianPhone::normalize('555000001'));
    }

    public function test_variants_include_plus_and_bare_forms(): void
    {
        $variants = GeorgianPhone::variants('995555000001');

        $this->assertContains('+995555000001', $variants);
        $this->assertContains('995555000001', $variants);
        $this->assertContains('555000001', $variants);
    }
}
