<?php
// POST { username, password } → { authed, csrf, user }. Throttled per IP and globally.
require __DIR__ . '/_lib.php';

tm_require_method('POST');
$users = tm_users();
if (!$users) tm_json(409, array('error' => 'No administrator has been set up yet.'));
if (tm_login_blocked()) tm_json(429, array('error' => 'Too many attempts. Wait 15 minutes and try again.'));

$body = tm_json_body();
$username = strtolower(trim(tm_str($body, 'username')));
$password = tm_str($body, 'password');

$i = tm_find_user($users, 'username', $username);
// Unknown user: still burn a hash check so timing doesn't reveal which names exist.
$hash = $i >= 0 ? $users[$i]['hash'] : '$2y$10$p23yBK.8ssDI5UXebtljAuL3EDD9APK0LFr8uUZ3Q4ZOQHIKLRxKm';
$ok = $password !== '' && strlen($password) <= 1024 && password_verify($password, $hash) && $i >= 0;

if (!$ok) {
    tm_login_failed();
    usleep(400000);
    tm_json(401, array('error' => 'Wrong username or password.'));
}

$user = tm_locked(function () use ($users, $i, $password) {
    $fresh = tm_users();
    $j = tm_find_user($fresh, 'id', $users[$i]['id']);
    if ($j < 0) return null;
    $fresh[$j]['last_login'] = time();
    if (password_needs_rehash($fresh[$j]['hash'], PASSWORD_DEFAULT)) $fresh[$j]['hash'] = password_hash($password, PASSWORD_DEFAULT);
    tm_save_users($fresh);
    return $fresh[$j];
});
if ($user === null) tm_json(401, array('error' => 'Wrong username or password.'));

tm_session_start();
session_regenerate_id(true);
$_SESSION['tm_uid'] = $user['id'];
$_SESSION['tm_csrf'] = bin2hex(random_bytes(32));

tm_json(200, array(
    'authed' => true,
    'csrf' => $_SESSION['tm_csrf'],
    'user' => tm_public_user($user),
    'maxUpload' => tm_max_upload(),
));
