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

chdir($laravelPublic);
require $laravelPublic . '/index.php';
