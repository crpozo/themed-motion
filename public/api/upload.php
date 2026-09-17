<?php
// POST multipart { file, thumb? } → { path, thumb }. Stores a picture or clip
// under data/uploads/ with a random name. The type is decided by the file's
// real content, never by its name, and only media types are accepted — nothing
// that a browser or the server could run.
require __DIR__ . '/_lib.php';

tm_require_method('POST');
tm_require_auth();

// A body larger than post_max_size arrives with $_FILES empty.
if (empty($_FILES['file']) || !is_array($_FILES['file']) || is_array($_FILES['file']['error'])) {
    $len = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($len > tm_max_upload()) tm_json(413, array('error' => 'That file is larger than the hosting accepts (' . round(tm_max_upload() / 1048576) . ' MB).'));
    tm_json(400, array('error' => 'No file received.'));
}
$file = $_FILES['file'];
if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) {
    tm_json(413, array('error' => 'That file is larger than the hosting accepts (' . round(tm_max_upload() / 1048576) . ' MB).'));
}
if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) tm_json(400, array('error' => 'The upload did not complete. Try again.'));

$types = array(
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
    'video/mp4' => 'mp4', 'video/webm' => 'webm',
);
$mime = '';
if (function_exists('finfo_open')) {
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    if ($fi) $mime = (string) finfo_file($fi, $file['tmp_name']);
} elseif (function_exists('mime_content_type')) {
    $mime = (string) mime_content_type($file['tmp_name']);
}
if (!isset($types[$mime])) tm_json(415, array('error' => 'Use a JPG, PNG, WebP or GIF picture, or an MP4 / WebM video.'));
$ext = $types[$mime];
$isImage = strpos($mime, 'image/') === 0;

$size = (int) filesize($file['tmp_name']);
$limit = $isImage ? TM_MAX_IMAGE : TM_MAX_VIDEO;
if ($size <= 0 || $size > $limit) tm_json(413, array('error' => 'That file is too large — the limit is ' . round($limit / 1048576) . ' MB for ' . ($isImage ? 'pictures' : 'videos') . '.'));

if ($isImage) {
    $dim = @getimagesize($file['tmp_name']);
    if (!$dim || $dim[0] < 1 || $dim[1] < 1 || $dim[0] > 12000 || $dim[1] > 12000) tm_json(415, array('error' => 'That picture could not be read.'));
}

if (!is_dir(TM_UPLOAD_DIR) && !@mkdir(TM_UPLOAD_DIR, 0755, true) && !is_dir(TM_UPLOAD_DIR)) {
    tm_json(500, array('error' => 'Cannot create the uploads folder — check folder permissions on the hosting.'));
}
$guard = TM_UPLOAD_DIR . '/.htaccess';
if (!is_file($guard)) {
    @file_put_contents($guard, "# Uploaded media only - nothing in here may ever run as code.\n"
        . "<FilesMatch \"\\.(?i:php\\d?|phtml|phar|pht|cgi|pl|py|sh|html?|js|svg)$\">\n" . tm_deny_htaccess() . "</FilesMatch>\n"
        . "<IfModule mod_headers.c>\nHeader set X-Content-Type-Options \"nosniff\"\n</IfModule>\n");
}

$name = bin2hex(random_bytes(8));
$dest = TM_UPLOAD_DIR . '/' . $name . '.' . $ext;
if (!move_uploaded_file($file['tmp_name'], $dest)) tm_json(500, array('error' => 'Could not store the file — check folder permissions on the hosting.'));
@chmod($dest, 0644);

// Light thumbnail for galleries (max 700px). Best effort: without GD, or for a
// format GD can't open here, the gallery simply uses the full picture.
$thumb = null;
if ($isImage && !empty($_POST['thumb']) && function_exists('imagecreatetruecolor')) {
    $loaders = array('jpg' => 'imagecreatefromjpeg', 'png' => 'imagecreatefrompng', 'webp' => 'imagecreatefromwebp', 'gif' => 'imagecreatefromgif');
    $src = function_exists($loaders[$ext]) ? @call_user_func($loaders[$ext], $dest) : false;
    if ($src) {
        // Phone photos carry their rotation in EXIF; GD ignores it, browsers don't.
        if ($ext === 'jpg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($dest);
            $o = is_array($exif) && isset($exif['Orientation']) ? (int) $exif['Orientation'] : 1;
            $angle = $o === 3 ? 180 : ($o === 6 ? -90 : ($o === 8 ? 90 : 0));
            if ($angle) { $rot = @imagerotate($src, $angle, 0); if ($rot) $src = $rot; }
        }
        $w = imagesx($src); $h = imagesy($src);
        $scale = min(1, 700 / max($w, $h));
        $tw = max(1, (int) round($w * $scale)); $th = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($tw, $th);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $tw, $th, $w, $h);
        if (@imagejpeg($dst, TM_UPLOAD_DIR . '/' . $name . '_t.jpg', 82)) {
            @chmod(TM_UPLOAD_DIR . '/' . $name . '_t.jpg', 0644);
            $thumb = 'data/uploads/' . $name . '_t.jpg';
        }
    }
}

tm_json(200, array('ok' => true, 'path' => 'data/uploads/' . $name . '.' . $ext, 'thumb' => $thumb));
