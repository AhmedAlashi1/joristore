<?php

declare(strict_types=1);

/**
 * Storefront docroot (~/public_html) → Laravel ~/joristore/public
 * Same-origin API without relying on dashboard SSL.
 */
$laravelPublic = realpath(dirname(__DIR__) . '/joristore/public');
if ($laravelPublic === false || ! is_file($laravelPublic . '/index.php')) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Laravel not found. Expected ~/joristore/public next to ~/public_html.\n";
    exit(1);
}

$rawUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($rawUri, PHP_URL_PATH) ?: '/';
$query = parse_url($rawUri, PHP_URL_QUERY);

if (str_starts_with($path, '/index.php')) {
    $path = substr($path, strlen('/index.php')) ?: '/';
}

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $laravelPublic . '/index.php';
$_SERVER['PHP_SELF'] = '/index.php' . $path;
$_SERVER['REQUEST_URI'] = $path . ($query !== null && $query !== '' ? '?' . $query : '');

chdir($laravelPublic);
require $laravelPublic . '/index.php';
