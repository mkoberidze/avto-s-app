<?php

namespace App\Support;

use RuntimeException;

class RateLimited extends RuntimeException
{
    public function __construct(public int $retryAfter)
    {
        parent::__construct('Translation rate limited');
    }
}
