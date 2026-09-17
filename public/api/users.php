<?php
// User management — administrators only.
//   GET                                                  → { users }
//   POST { action: create, username, name, role, password }
//   POST { action: update, id, name, role }
//   POST { action: password, id, password }
//   POST { action: delete, id }                           → { users }
require __DIR__ . '/_lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    tm_require_auth('admin');
    tm_json(200, array('users' => array_map('tm_public_user', tm_users())));
}

tm_require_method('POST');
$me = tm_require_auth('admin');
$body = tm_json_body();
$action = tm_str($body, 'action');

$result = tm_locked(function () use ($me, $body, $action) {
    $users = tm_users();
    $role = tm_str($body, 'role') === 'admin' ? 'admin' : 'editor';

    if ($action === 'create') {
        $username = strtolower(trim(tm_str($body, 'username')));
        if (!preg_match(TM_USERNAME_RE, $username)) return 'Usernames are 3–32 characters: lowercase letters, numbers, dot, dash or underscore.';
        if (tm_find_user($users, 'username', $username) >= 0) return 'That username is already taken.';
        if (count($users) >= TM_MAX_USERS) return 'User limit reached.';
        $problem = tm_password_problem(isset($body['password']) ? $body['password'] : null);
        if ($problem !== '') return $problem;
        $users[] = array(
            'id' => 'u-' . bin2hex(random_bytes(6)),
            'username' => $username,
            'name' => tm_clean_name(tm_str($body, 'name'), $username),
            'role' => $role,
            'hash' => password_hash($body['password'], PASSWORD_DEFAULT),
            'created' => time(),
            'last_login' => null,
        );
    } else {
        $i = tm_find_user($users, 'id', tm_str($body, 'id'));
        if ($i < 0) return 'That user no longer exists.';
        $self = $users[$i]['id'] === $me['id'];

        if ($action === 'update') {
            if ($self && $role !== 'admin') return 'You can’t remove your own administrator role.';
            $users[$i]['name'] = tm_clean_name(tm_str($body, 'name'), $users[$i]['username']);
            $users[$i]['role'] = $role;
        } elseif ($action === 'password') {
            $problem = tm_password_problem(isset($body['password']) ? $body['password'] : null);
            if ($problem !== '') return $problem;
            $users[$i]['hash'] = password_hash($body['password'], PASSWORD_DEFAULT);
        } elseif ($action === 'delete') {
            if ($self) return 'You can’t delete your own account.';
            array_splice($users, $i, 1);
        } else {
            return 'Unknown action.';
        }
    }

    if (!tm_save_users($users)) return 'Could not save the users file — check folder permissions on the hosting.';
    return $users;
});

if (is_string($result)) tm_json(400, array('error' => $result));
tm_json(200, array('ok' => true, 'users' => array_map('tm_public_user', $result)));
