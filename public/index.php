<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// public/ when the app root is the parent directory, public_html/ when
// the app lives in the sibling laravel/ directory on the host.
$base = is_file(__DIR__.'/../vendor/autoload.php')
    ? __DIR__.'/..'
    : __DIR__.'/../../laravel';

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $base.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $base.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once $base.'/bootstrap/app.php';

// The web root is this file's directory. On the host that is public_html,
// which is where the Vite build is uploaded.
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
