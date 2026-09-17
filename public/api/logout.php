<?php
// POST → ends the admin session.
require __DIR__ . '/_lib.php';

tm_require_method('POST');
tm_session_start();
$_SESSION = array();
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

tm_json(200, array('ok' => true));
