<?php
$urls = [
    'https://dhobi-api.bizz-manager.com/public/api/v1/shops/44',
    'https://dhobi-api.bizz-manager.com/public/api/v1/shops/48',
    'https://dhobi-api.bizz-manager.com/public/api/v1/shops/30'
];

foreach ($urls as $url) {
    $res = @file_get_contents($url);
    $j = json_decode($res, true);
    $shop = $j['data']['shop'] ?? [];
    echo "URL: $url\n";
    echo "  Name: " . ($shop['name'] ?? 'none') . "\n";
    echo "  Gallery: " . json_encode($shop['gallery'] ?? null) . "\n";
    echo "  Shop Photos: " . json_encode($shop['shop_photos'] ?? null) . "\n";
    echo "  Root Gallery: " . json_encode($j['data']['gallery'] ?? null) . "\n\n";
}
