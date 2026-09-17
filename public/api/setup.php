<?php
// One-time page that creates the first administrator. It only works while no
// user exists; to start over, delete api/config.php in the hosting File Manager
// and open this page again. Further users are added from the dashboard.
require __DIR__ . '/_lib.php';

header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

$done = false;
$error = '';
$configured = count(tm_users()) > 0;
$username = '';
$name = '';

if (!$configured && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = strtolower(trim(isset($_POST['username']) ? (string) $_POST['username'] : ''));
    $name = isset($_POST['name']) ? (string) $_POST['name'] : '';
    $p1 = isset($_POST['password']) ? (string) $_POST['password'] : '';
    $p2 = isset($_POST['confirm']) ? (string) $_POST['confirm'] : '';
    if (!preg_match(TM_USERNAME_RE, $username)) {
        $error = 'Usernames are 3–32 characters: lowercase letters, numbers, dot, dash or underscore.';
    } elseif (tm_password_problem($p1) !== '') {
        $error = tm_password_problem($p1);
    } elseif (!hash_equals($p1, $p2)) {
        $error = 'The two passwords do not match.';
    } else {
        $ok = tm_locked(function () use ($username, $name, $p1) {
            if (count(tm_users()) > 0) return false;
            return tm_save_users(array(array(
                'id' => 'u-' . bin2hex(random_bytes(6)),
                'username' => $username,
                'name' => tm_clean_name($name, $username),
                'role' => 'admin',
                'hash' => password_hash($p1, PASSWORD_DEFAULT),
                'created' => time(),
                'last_login' => null,
            )));
        });
        if (!$ok) {
            $error = 'Could not write api/config.php — check folder permissions on the hosting.';
        } else {
            if (!is_file(TM_CONTENT_FILE)) tm_write_atomic(TM_CONTENT_FILE, "{\"v\": 2}\n");
            $done = true;
        }
    }
}
$e = function ($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>ThemedMotion · Admin setup</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f5f5; color: #111; font: 16px/1.55 "Barlow", "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .card { width: min(92vw, 420px); background: #fff; border: 1px solid #e3e3e3; border-radius: 14px; padding: 36px 32px; box-sizing: border-box; }
  img { height: 44px; display: block; margin-bottom: 22px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p { margin: 0 0 18px; color: #555; }
  label { display: block; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #6a6a6a; margin: 14px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #ccc; border-radius: 8px; font: inherit; }
  input:focus { outline: 2px solid #F26B1F; outline-offset: 1px; border-color: #F26B1F; }
  button, .btn { display: inline-block; margin-top: 22px; width: 100%; box-sizing: border-box; padding: 13px 16px; border: 0; border-radius: 999px; background: #F26B1F; color: #fff; font: inherit; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; }
  .error { margin-top: 14px; color: #b42318; font-weight: 500; }
  .warn { margin-top: 18px; font-size: 14px; color: #8a4b00; background: #fff4e5; border-radius: 8px; padding: 10px 12px; }
</style>
</head>
<body>
<div class="card">
  <img src="../assets/themedmotion-logo.png" alt="ThemedMotion">
<?php if ($done): ?>
  <h1>Administrator created</h1>
  <p>The site admin is ready. Log in to edit the content and add more users.</p>
  <a class="btn" href="../#/admin">Go to the login</a>
<?php elseif ($configured): ?>
  <h1>Already set up</h1>
  <p>An administrator already exists. New users are added from the dashboard. To start over, delete <code>api/config.php</code> in the hosting File Manager and reload this page.</p>
  <a class="btn" href="../#/admin">Go to the login</a>
<?php else: ?>
  <h1>Create the first administrator</h1>
  <p>This account manages the website content and the other users. Choose a password you don't use anywhere else.</p>
  <form method="post" autocomplete="off">
    <label for="username">Username</label>
    <input id="username" name="username" type="text" value="<?php echo $e($username); ?>" minlength="3" maxlength="32" pattern="[a-z0-9][a-z0-9._\-]{2,31}" required autocapitalize="none" autocomplete="username">
    <label for="name">Your name (optional)</label>
    <input id="name" name="name" type="text" value="<?php echo $e($name); ?>" maxlength="60" autocomplete="name">
    <label for="password">Password (<?php echo TM_MIN_PASSWORD; ?>+ characters)</label>
    <input id="password" name="password" type="password" minlength="<?php echo TM_MIN_PASSWORD; ?>" required autocomplete="new-password">
    <label for="confirm">Repeat it</label>
    <input id="confirm" name="confirm" type="password" minlength="<?php echo TM_MIN_PASSWORD; ?>" required autocomplete="new-password">
    <?php if ($error !== ''): ?><div class="error"><?php echo $e($error); ?></div><?php endif; ?>
    <button type="submit">Create administrator</button>
  </form>
  <?php if (!tm_is_https()): ?><div class="warn">This page is not on HTTPS, so the password travels unencrypted. Install the SSL certificate first if you can.</div><?php endif; ?>
<?php endif; ?>
</div>
</body>
</html>
