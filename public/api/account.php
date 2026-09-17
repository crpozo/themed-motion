<?php
// The logged-in user's own account.
//   POST { action: password, current, password }
//   POST { action: profile, name }                        → { user }
require __DIR__ . '/_lib.php';

tm_require_method('POST');
$me = tm_require_auth();
$body = tm_json_body();
$action = tm_str($body, 'action');

if ($action === 'password' && tm_login_blocked()) tm_json(429, array('error' => 'Too many attempts. Wait 15 minutes and try again.'));

$result = tm_locked(function () use ($me, $body, $action) {
    $users = tm_users();
    $i = tm_find_user($users, 'id', $me['id']);
    if ($i < 0) return 'Your account no longer exists.';

    if ($action === 'password') {
        $current = tm_str($body, 'current');
        if ($current === '' || !password_verify($current, $users[$i]['hash'])) {
            tm_login_failed();
            return 'Your current password is not correct.';
        }
        $problem = tm_password_problem(isset($body['password']) ? $body['password'] : null);
        if ($problem !== '') return $problem;
        $users[$i]['hash'] = password_hash($body['password'], PASSWORD_DEFAULT);
    } elseif ($action === 'profile') {
        $users[$i]['name'] = tm_clean_name(tm_str($body, 'name'), $users[$i]['username']);
    } else {
        return 'Unknown action.';
    }

    if (!tm_save_users($users)) return 'Could not save — check folder permissions on the hosting.';
    return $users[$i];
});

if (is_string($result)) tm_json(400, array('error' => $result));
tm_json(200, array('ok' => true, 'user' => tm_public_user($result)));
