<?php
session_start();
require_once __DIR__ . '/admin_panel_php/includes/header.php';
echo "isLaundryOwner: " . (isLaundryOwner() ? 'yes' : 'no') . "\n";
echo "currentShopId: " . currentShopId() . "\n";
