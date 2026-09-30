<?php
$res = file_get_contents('http://localhost/dhobi_backend/public/api/v1/admin/subscriptions/subscribers');
echo "Response: " . $res;
