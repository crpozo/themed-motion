<?php
// POST { doc } → { ok, doc }. Replaces the whole override document; the
// previous version is kept as a backup first. Any logged-in user may save.
require __DIR__ . '/_lib.php';

tm_require_method('POST');
tm_require_auth();

$body = tm_json_body();
if (!isset($body['doc']) || !is_array($body['doc'])) tm_json(400, array('error' => 'Missing content.'));
$doc = tm_clean_doc($body['doc']);

$private = tm_private_dir();
if (is_file(TM_CONTENT_FILE)) {
    $backups = $private . '/backups';
    if (!is_dir($backups)) @mkdir($backups, 0755, true);
    @copy(TM_CONTENT_FILE, $backups . '/content-' . gmdate('Ymd-His') . '.json');
    $old = glob($backups . '/content-*.json');
    if (is_array($old) && count($old) > TM_BACKUPS_KEPT) {
        sort($old);
        foreach (array_slice($old, 0, count($old) - TM_BACKUPS_KEPT) as $f) @unlink($f);
    }
}

$json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false || !tm_write_atomic(TM_CONTENT_FILE, $json . "\n")) {
    tm_json(500, array('error' => 'Could not write the content file — check folder permissions on the hosting.'));
}

tm_json(200, array('ok' => true, 'doc' => $doc));
