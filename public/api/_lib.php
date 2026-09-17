<?php
// Shared helpers for the site-admin API. Written for PHP 7.2+ so it runs on
// whatever version the shared hosting happens to ship. No database: a handful
// of files, all created ON THE SERVER and never part of the build, so uploading
// a new build leaves them alone — do not delete them when re-uploading:
//
//   api/config.php            the users (name, role, password hash) — created by setup.php
//   data/content.json         the saved content overrides (public, read by the site)
//   data/uploads/             pictures and clips uploaded from the dashboard (public)
//   data/private/             login-attempt log + content backups (web access denied)

declare(strict_types=1);

// Responses are JSON: a PHP notice printed into the body would corrupt them.
// Problems go to the hosting's error log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

define('TM_CONFIG_FILE', __DIR__ . '/config.php');
define('TM_DATA_DIR', dirname(__DIR__) . '/data');
define('TM_CONTENT_FILE', TM_DATA_DIR . '/content.json');
define('TM_UPLOAD_DIR', TM_DATA_DIR . '/uploads');
define('TM_PRIVATE_DIR', TM_DATA_DIR . '/private');

define('TM_MAX_BODY', 1048576);     // 1 MB JSON request body
define('TM_MAX_KEYS', 800);
define('TM_MAX_VALUE', 6000);       // chars per text field
define('TM_MAX_LIST_ITEMS', 300);
define('TM_BACKUPS_KEPT', 30);
define('TM_LOGIN_WINDOW', 900);     // 15 min
define('TM_LOGIN_MAX_PER_IP', 8);
define('TM_LOGIN_MAX_GLOBAL', 40);
define('TM_MAX_USERS', 50);
define('TM_MIN_PASSWORD', 10);
define('TM_MAX_IMAGE', 12 * 1048576);
define('TM_MAX_VIDEO', 96 * 1048576);

define('TM_KEY_RE', '/^[a-z0-9._-]{1,80}$/i');
define('TM_ID_RE', '/^[a-z0-9-]{1,40}$/');
define('TM_FIELD_RE', '/^[a-z][a-zA-Z0-9]{0,30}$/');
define('TM_USERNAME_RE', '/^[a-z0-9][a-z0-9._-]{2,31}$/');
define('TM_MEDIA_RE', '#^(assets|data/uploads)/[A-Za-z0-9][A-Za-z0-9._/-]{0,200}\.(jpe?g|png|webp|gif|mp4|webm)$#i');

function tm_is_https()
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') return true;
    return false;
}

function tm_session_start()
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('tm_admin');
    // PHP < 7.3 has no samesite option; the CSRF token covers that case.
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params(array(
            'lifetime' => 0,
            'path' => '/',
            'secure' => tm_is_https(),
            'httponly' => true,
            'samesite' => 'Strict',
        ));
    } else {
        session_set_cookie_params(0, '/', '', tm_is_https(), true);
    }
    session_start();
}

function tm_json($status, $body)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function tm_require_method($method)
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        tm_json(405, array('error' => 'Method not allowed.'));
    }
}

function tm_json_body()
{
    $raw = file_get_contents('php://input', false, null, 0, TM_MAX_BODY + 1);
    if ($raw === false || strlen($raw) > TM_MAX_BODY) tm_json(413, array('error' => 'Request too large.'));
    $data = json_decode($raw, true);
    if (!is_array($data)) tm_json(400, array('error' => 'Invalid JSON.'));
    return $data;
}

function tm_str($arr, $key)
{
    return isset($arr[$key]) && is_string($arr[$key]) ? $arr[$key] : '';
}

function tm_deny_htaccess()
{
    return "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n"
         . "<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n";
}

// data/private/ holds files that must never be served; created on demand.
function tm_private_dir()
{
    if (!is_dir(TM_PRIVATE_DIR) && !@mkdir(TM_PRIVATE_DIR, 0755, true) && !is_dir(TM_PRIVATE_DIR)) {
        tm_json(500, array('error' => 'Cannot create the data folder — check folder permissions on the hosting.'));
    }
    $ht = TM_PRIVATE_DIR . '/.htaccess';
    if (!is_file($ht)) @file_put_contents($ht, tm_deny_htaccess());
    return TM_PRIVATE_DIR;
}

function tm_write_atomic($file, $contents)
{
    $tmp = $file . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false) return false;
    @chmod($tmp, 0644);
    if (!@rename($tmp, $file)) { @unlink($tmp); return false; }
    return true;
}

// Serialises read-modify-write cycles on the users file.
function tm_locked($fn)
{
    $lock = @fopen(tm_private_dir() . '/lock', 'c');
    if ($lock) @flock($lock, LOCK_EX);
    try {
        return $fn();
    } finally {
        if ($lock) { @flock($lock, LOCK_UN); @fclose($lock); }
    }
}

// ---- users ------------------------------------------------------------------
// Roles: "admin" manages users and content; "editor" manages content only.

function tm_users()
{
    if (!is_file(TM_CONFIG_FILE)) return array();
    if (function_exists('opcache_invalidate')) @opcache_invalidate(TM_CONFIG_FILE, true);
    $cfg = include TM_CONFIG_FILE;
    if (!is_array($cfg)) return array();
    // First version of the editor stored a single shared password.
    if (!isset($cfg['users']) && !empty($cfg['password_hash'])) {
        return array(array(
            'id' => 'u-legacy', 'username' => 'admin', 'name' => 'Admin', 'role' => 'admin',
            'hash' => $cfg['password_hash'], 'created' => 0, 'last_login' => null,
        ));
    }
    $users = array();
    foreach (isset($cfg['users']) && is_array($cfg['users']) ? $cfg['users'] : array() as $u) {
        if (is_array($u) && !empty($u['id']) && !empty($u['username']) && !empty($u['hash'])) $users[] = $u;
    }
    return $users;
}

function tm_save_users($users)
{
    $php = "<?php\n// Site-admin users. Written by the API — delete this file to start over with setup.php.\nreturn "
         . var_export(array('users' => array_values($users)), true) . ";\n";
    if (!tm_write_atomic(TM_CONFIG_FILE, $php)) return false;
    @chmod(TM_CONFIG_FILE, 0600);
    return true;
}

function tm_find_user($users, $field, $value)
{
    foreach ($users as $i => $u) if (isset($u[$field]) && $u[$field] === $value) return $i;
    return -1;
}

function tm_public_user($u)
{
    return array(
        'id' => $u['id'],
        'username' => $u['username'],
        'name' => isset($u['name']) ? $u['name'] : $u['username'],
        'role' => isset($u['role']) && $u['role'] === 'admin' ? 'admin' : 'editor',
        'created' => isset($u['created']) ? (int) $u['created'] : 0,
        'lastLogin' => isset($u['last_login']) ? $u['last_login'] : null,
    );
}

function tm_clean_name($name, $fallback)
{
    $name = trim(preg_replace('/\s+/', ' ', strip_tags((string) $name)));
    if (function_exists('mb_substr')) $name = mb_substr($name, 0, 60, 'UTF-8'); else $name = substr($name, 0, 60);
    return $name !== '' ? $name : $fallback;
}

function tm_password_problem($password)
{
    if (!is_string($password) || strlen($password) < TM_MIN_PASSWORD) return 'Use at least ' . TM_MIN_PASSWORD . ' characters for the password.';
    if (strlen($password) > 1024) return 'That password is too long.';
    return '';
}

// The logged-in user, re-read from disk so a deleted/demoted user loses access at once.
function tm_current_user()
{
    tm_session_start();
    if (empty($_SESSION['tm_uid']) || empty($_SESSION['tm_csrf'])) return null;
    $users = tm_users();
    $i = tm_find_user($users, 'id', $_SESSION['tm_uid']);
    return $i < 0 ? null : $users[$i];
}

function tm_require_auth($role = null)
{
    $user = tm_current_user();
    if ($user === null) tm_json(401, array('error' => 'Not logged in.'));
    $sent = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? (string) $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    if (!hash_equals($_SESSION['tm_csrf'], $sent)) tm_json(403, array('error' => 'Bad CSRF token.'));
    if ($role === 'admin' && (!isset($user['role']) || $user['role'] !== 'admin')) {
        tm_json(403, array('error' => 'Only an administrator can do that.'));
    }
    return $user;
}

function tm_ini_bytes($name)
{
    $v = trim((string) ini_get($name));
    if ($v === '') return 0;
    $n = (float) $v;
    switch (strtolower(substr($v, -1))) {
        case 'g': $n *= 1024;
        case 'm': $n *= 1024;
        case 'k': $n *= 1024;
    }
    return (int) $n;
}

function tm_max_upload()
{
    $limits = array_filter(array(tm_ini_bytes('upload_max_filesize'), tm_ini_bytes('post_max_size')));
    return $limits ? (int) min(min($limits), TM_MAX_VIDEO) : TM_MAX_VIDEO;
}

// ---- login throttling -------------------------------------------------------

function tm_attempts_file()
{
    return tm_private_dir() . '/attempts.json';
}

function tm_attempts_load()
{
    $file = tm_attempts_file();
    $list = is_file($file) ? json_decode((string) @file_get_contents($file), true) : array();
    if (!is_array($list)) $list = array();
    $cut = time() - TM_LOGIN_WINDOW;
    $fresh = array();
    foreach ($list as $a) {
        if (is_array($a) && isset($a['t'], $a['ip']) && $a['t'] >= $cut) $fresh[] = $a;
    }
    return $fresh;
}

function tm_ip_id()
{
    // Hashed so the log never stores visitor addresses in the clear.
    return substr(hash('sha256', isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '?'), 0, 16);
}

function tm_login_blocked()
{
    $mine = 0;
    $list = tm_attempts_load();
    $ip = tm_ip_id();
    foreach ($list as $a) if ($a['ip'] === $ip) $mine++;
    return $mine >= TM_LOGIN_MAX_PER_IP || count($list) >= TM_LOGIN_MAX_GLOBAL;
}

function tm_login_failed()
{
    $list = tm_attempts_load();
    $list[] = array('t' => time(), 'ip' => tm_ip_id());
    tm_write_atomic(tm_attempts_file(), json_encode($list));
}

// ---- content sanitizing -----------------------------------------------------
// The saved document: { v: 2, text: {key: html}, media: {key: path},
// flags: {key: bool}, lists: {key: [ {id, type?, field: string|bool} ]} }.
// The browser re-validates everything against its schema on load; this keeps
// the file itself clean and bounded.

// Same whitelist as cleanHtml() in src/content.jsx: text plus <b>, <em>, <br>.
function tm_clean_value($v)
{
    $v = str_replace("\0", '', (string) $v);
    $v = strip_tags($v, '<b><em><br>');
    $v = preg_replace_callback('/<(\/?)(b|em|br)\b[^>]*>/i', function ($m) {
        $tag = strtolower($m[2]);
        return $tag === 'br' ? '<br>' : '<' . $m[1] . $tag . '>';
    }, $v);
    $v = preg_replace('/[ \t\r\n]+/', ' ', (string) $v);
    return trim((string) $v);
}

function tm_checked_text($v, $label)
{
    if (!is_string($v)) tm_json(400, array('error' => 'Invalid value for ' . $label . '.'));
    $v = tm_clean_value($v);
    $len = function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v);
    if ($len > TM_MAX_VALUE) tm_json(400, array('error' => 'The text in ' . $label . ' is too long.'));
    return $v;
}

function tm_is_media_path($v)
{
    return is_string($v) && strpos($v, '..') === false && preg_match(TM_MEDIA_RE, $v) === 1;
}

function tm_checked_key($key, $re)
{
    if (!is_string($key) && !is_int($key)) tm_json(400, array('error' => 'Invalid field name.'));
    $key = (string) $key;
    if (!preg_match($re, $key)) tm_json(400, array('error' => 'Invalid field name.'));
    return $key;
}

function tm_clean_doc($doc)
{
    $out = array('text' => array(), 'media' => array(), 'flags' => array(), 'lists' => array());
    $total = 0;

    foreach (isset($doc['text']) && is_array($doc['text']) ? $doc['text'] : array() as $key => $value) {
        $key = tm_checked_key($key, TM_KEY_RE);
        $out['text'][$key] = tm_checked_text($value, $key);
        $total++;
    }
    foreach (isset($doc['media']) && is_array($doc['media']) ? $doc['media'] : array() as $key => $value) {
        $key = tm_checked_key($key, TM_KEY_RE);
        if (!tm_is_media_path($value)) tm_json(400, array('error' => 'Invalid file for ' . $key . '.'));
        $out['media'][$key] = $value;
        $total++;
    }
    foreach (isset($doc['flags']) && is_array($doc['flags']) ? $doc['flags'] : array() as $key => $value) {
        $key = tm_checked_key($key, TM_KEY_RE);
        if (!is_bool($value)) tm_json(400, array('error' => 'Invalid switch value for ' . $key . '.'));
        $out['flags'][$key] = $value;
        $total++;
    }
    foreach (isset($doc['lists']) && is_array($doc['lists']) ? $doc['lists'] : array() as $key => $items) {
        $key = tm_checked_key($key, TM_KEY_RE);
        if (!is_array($items) || count($items) > TM_MAX_LIST_ITEMS) tm_json(400, array('error' => 'The list ' . $key . ' is too long.'));
        $list = array();
        $seen = array();
        foreach (array_values($items) as $item) {
            if (!is_array($item) || !isset($item['id']) || !is_string($item['id']) || !preg_match(TM_ID_RE, $item['id']) || isset($seen[$item['id']])) {
                tm_json(400, array('error' => 'Invalid item in ' . $key . '.'));
            }
            if (count($item) > 12) tm_json(400, array('error' => 'Invalid item in ' . $key . '.'));
            $seen[$item['id']] = true;
            $clean = array('id' => $item['id']);
            foreach ($item as $field => $value) {
                if ($field === 'id') continue;
                $field = tm_checked_key($field, TM_FIELD_RE);
                $clean[$field] = is_bool($value) ? $value : tm_checked_text($value, $key);
            }
            $list[] = $clean;
            $total++;
        }
        $out['lists'][$key] = $list;
    }

    if ($total > TM_MAX_KEYS) tm_json(400, array('error' => 'Too much content in one save.'));
    ksort($out['text']);
    ksort($out['media']);
    ksort($out['flags']);
    ksort($out['lists']);

    // Empty maps must serialize as {} (not []), or the site would misread them.
    $json = array('v' => 2);
    foreach ($out as $part => $map) $json[$part] = $map ? $map : new stdClass();
    return $json;
}
