<?php
$res = file_get_contents('http://127.0.0.1/dhobi_backend/public/api/v1/shops');
if (!$res) {
    $res = file_get_contents('http://localhost:8000/api/v1/shops');
}
echo $res;
