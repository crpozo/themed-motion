<?php
// GET → { configured, authed, csrf, user, maxUpload }. Lets the site resume a session.
require __DIR__ . '/_lib.php';

tm_require_method('GET');
$configured = count(tm_users()) > 0;
$user = $configured ? tm_current_user() : null;

tm_json(200, array(
    'configured' => $configured,
    'authed' => $user !== null,
    'csrf' => $user !== null ? $_SESSION['tm_csrf'] : null,
    'user' => $user !== null ? tm_public_user($user) : null,
    'maxUpload' => $user !== null ? tm_max_upload() : 0,
));
