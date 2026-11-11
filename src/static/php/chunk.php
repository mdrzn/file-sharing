<?php
// Sequential 8 MiB chunks are kept outside the web root until fully validated.
header('Content-Type: application/json');
header('Cache-Control: no-store');
function chunkError(int $status, string $message): never {
    http_response_code($status);
    echo json_encode(['success' => false, 'description' => $message]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') chunkError(405, 'Use POST.');
$config = json_decode(file_get_contents(__DIR__ . '/../config.json'), true);
$limit = (int) $config['max_upload_size'] * 1024 * 1024;
$total = filter_var($_POST['total'] ?? '', FILTER_VALIDATE_INT);
$offset = filter_var($_POST['offset'] ?? '', FILTER_VALIDATE_INT);
$name = $_POST['name'] ?? '';
if ($total === false || $total < 1 || $total > $limit) chunkError(413, 'File exceeds the upload limit.');
if ($offset === false || $offset < 0 || $offset >= $total || !is_string($name) || $name === '' || strlen($name) > 250) chunkError(400, 'Invalid upload metadata.');
$file = $_FILES['chunk'] ?? null;
if (!$file || is_array($file['error']) || $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) chunkError(400, 'Missing or incomplete chunk.');
$length = filesize($file['tmp_name']);
if ($length !== min(8 * 1024 * 1024, $total - $offset)) chunkError(400, 'Invalid chunk size.');
$dir = dirname(rtrim($config['FILES_ROOT'], '/')) . '/chunks';
if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) chunkError(500, 'Cannot create upload storage.');
$id = $_POST['id'] ?? '';
if ($id === '') {
    if ($offset !== 0) chunkError(400, 'Start with the first chunk.');
    $id = bin2hex(random_bytes(32));
    $stream = fopen($dir . '/' . $id . '.part', 'x+b');
    if (!$stream) chunkError(500, 'Cannot start upload.');
    flock($stream, LOCK_EX);
    if (file_put_contents($dir . '/' . $id . '.json', json_encode(['name' => $name, 'total' => $total])) === false) chunkError(500, 'Cannot store upload metadata.');
} else {
    if (!is_string($id) || !preg_match('/^[a-f0-9]{64}$/D', $id)) chunkError(400, 'Invalid upload ID.');
    $stream = @fopen($dir . '/' . $id . '.part', 'r+b');
    if (!$stream) chunkError(404, 'Upload expired. Please retry.');
    flock($stream, LOCK_EX);
    $meta = json_decode(@file_get_contents($dir . '/' . $id . '.json') ?: '{}', true);
    if (($meta['name'] ?? null) !== $name || ($meta['total'] ?? null) !== $total) chunkError(409, 'Upload metadata changed.');
}
if (fstat($stream)['size'] !== $offset) chunkError(409, 'Unexpected chunk offset. Please retry the upload.');
fseek($stream, 0, SEEK_END);
$input = fopen($file['tmp_name'], 'rb');
$copied = stream_copy_to_stream($input, $stream);
fclose($input);
if ($copied !== $length) {
    ftruncate($stream, $offset);
    chunkError(507, 'Insufficient upload storage.');
}
fflush($stream);
touch($dir . '/' . $id . '.part');
if ($offset + $length < $total) {
    echo json_encode(['success' => true, 'id' => $id, 'offset' => $offset + $length]);
    exit;
}
// Reuse PHP's authenticated upload temporary file so move_uploaded_file and
// all existing MIME, extension, hashing, and database checks still apply.
rewind($stream);
$output = fopen($file['tmp_name'], 'wb');
$copied = stream_copy_to_stream($stream, $output);
fclose($output);
unlink($dir . '/' . $id . '.part');
unlink($dir . '/' . $id . '.json');
fclose($stream);
if ($copied !== $total) chunkError(507, 'Could not assemble upload.');
$_FILES = ['files' => ['name' => [$name], 'type' => ['application/octet-stream'], 'tmp_name' => [$file['tmp_name']], 'error' => [UPLOAD_ERR_OK], 'size' => [$total]]];
$_GET['output'] = 'json';
require __DIR__ . '/upload.php';
