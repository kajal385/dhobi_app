<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=dhobi_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$boys = [
    [
        'name'     => 'Mahesh rane',
        'phone'    => '9876543211',
        'email'    => 'mahesh.rane@dhobipro.com',
        'vehicle'  => 'TVS scooty',
        'vehicle_type' => 'Scooter',
        'dl'       => '987654',
        'password' => password_hash('123456', PASSWORD_BCRYPT),
        'rating'   => 5.0,
        'completed'=> 0,
    ],
    [
        'name'     => 'Ravi Kumar',
        'phone'    => '9876543220',
        'email'    => 'ravi.kumar@dhobipro.com',
        'vehicle'  => 'Honda Activa (MH 12 AB 1234)',
        'vehicle_type' => 'Scooter',
        'dl'       => 'MH12-2024-009871',
        'password' => password_hash('123456', PASSWORD_BCRYPT),
        'rating'   => 4.9,
        'completed'=> 142,
    ],
    [
        'name'     => 'Vikas Singh',
        'phone'    => '9876543221',
        'email'    => 'vikas.singh@dhobipro.com',
        'vehicle'  => 'Hero Splendor (MH 12 CD 5678)',
        'vehicle_type' => 'Bike',
        'dl'       => 'MH12-2023-004523',
        'password' => password_hash('123456', PASSWORD_BCRYPT),
        'rating'   => 4.8,
        'completed'=> 98,
    ],
    [
        'name'     => 'Sunil Pawar',
        'phone'    => '9876577889',
        'email'    => 'sunil.pawar@dhobipro.com',
        'vehicle'  => 'TVS Jupiter (MH 12 EF 9012)',
        'vehicle_type' => 'Scooter',
        'dl'       => 'MH12-2025-007812',
        'password' => password_hash('123456', PASSWORD_BCRYPT),
        'rating'   => 4.6,
        'completed'=> 65,
    ],
];

foreach ($boys as $b) {
    // 1. Check or insert user
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$b['phone']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $userId = $user['id'];
        $upd = $pdo->prepare("UPDATE users SET name = ?, role = 'delivery_boy', is_active = 1, status = 'ACTIVE' WHERE id = ?");
        $upd->execute([$b['name'], $userId]);
    } else {
        $ins = $pdo->prepare("INSERT INTO users (name, phone, email, role, password, is_active, status, city, created_at, updated_at) VALUES (?, ?, ?, 'delivery_boy', ?, 1, 'ACTIVE', 'Pune', NOW(), NOW())");
        $ins->execute([$b['name'], $b['phone'], $b['email'], $b['password']]);
        $userId = $pdo->lastInsertId();
    }

    // 2. Check or insert delivery_boy
    $stmt2 = $pdo->prepare("SELECT id FROM delivery_boys WHERE user_id = ?");
    $stmt2->execute([$userId]);
    $dboy = $stmt2->fetch(PDO::FETCH_ASSOC);

    if ($dboy) {
        $upd2 = $pdo->prepare("UPDATE delivery_boys SET vehicle_number = ?, vehicle_type = ?, license_number = ?, is_online = 1, verification_status = 'approved', rating = ?, completed_orders_count = ?, updated_at = NOW() WHERE id = ?");
        $upd2->execute([$b['vehicle'], $b['vehicle_type'], $b['dl'], $b['rating'], $b['completed'], $dboy['id']]);
    } else {
        $ins2 = $pdo->prepare("INSERT INTO delivery_boys (user_id, vehicle_number, vehicle_type, license_number, is_online, verification_status, rating, active_orders_count, completed_orders_count, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 'approved', ?, 0, ?, NOW(), NOW())");
        $ins2->execute([$userId, $b['vehicle'], $b['vehicle_type'], $b['dl'], $b['rating'], $b['completed']]);
    }
}

echo "Seeded Delivery Boys Successfully into dhobi_db!\n";

$res = $pdo->query("SELECT d.id, u.name, u.phone, d.vehicle_number, d.license_number, d.verification_status FROM delivery_boys d JOIN users u ON d.user_id = u.id");
print_r($res->fetchAll(PDO::FETCH_ASSOC));
