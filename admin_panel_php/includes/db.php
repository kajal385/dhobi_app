<?php
/**
 * DhobiPro - Direct Database Connector for dhobi_db (MySQL)
 * 
 * Provides unified, high-performance database operations for:
 * - Delivery Boy onboarding, management, and shop-level assignment
 * - Order status and driver dispatch updates
 * - Full synchronization with phpMyAdmin / dhobi_db
 */

if (!function_exists('getDb')) {
    function getDb(): ?PDO {
        static $pdo = null;
        if ($pdo !== null) {
            return $pdo;
        }

        $host = '127.0.0.1';
        $port = 3306;
        $db   = 'dhobi_db';
        $user = 'root';
        $pass = '';

        try {
            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            return $pdo;
        } catch (\Throwable $e) {
            error_log("Database connection error: " . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('fetchDeliveryBoysFromDb')) {
    /**
     * Retrieve delivery boys from dhobi_db.
     * If $shopId is specified, filters strictly to that laundry shop.
     */
    function fetchDeliveryBoysFromDb($shopId = null): array {
        $db = getDb();
        if (!$db) return [];

        try {
            $sql = "SELECT 
                        d.id as delivery_boy_id,
                        d.id as id,
                        d.id as driver_id,
                        d.user_id,
                        d.shop_id,
                        d.shop_id as shopId,
                        u.name,
                        u.phone,
                        u.email,
                        u.city,
                        COALESCE(u.status, 'ACTIVE') as account_status,
                        COALESCE(u.status, 'ACTIVE') as accountStatus,
                        d.vehicle_type,
                        d.vehicle_type as vehicleType,
                        d.vehicle_number,
                        d.vehicle_number as vehicleNumber,
                        d.license_number as dl_number,
                        d.license_number as dlNumber,
                        d.is_online,
                        (d.is_online = 1) as isOnline,
                        COALESCE(d.rating, 5.0) as rating,
                        COALESCE(d.completed_orders_count, 0) as completed_deliveries,
                        COALESCE(d.completed_orders_count, 0) as completedDeliveries,
                        COALESCE(d.active_orders_count, 0) as assigned_orders,
                        COALESCE(d.active_orders_count, 0) as assignedOrders,
                        COALESCE(d.verification_status, 'approved') as verification_status,
                        d.created_at,
                        d.created_at as createdAt,
                        COALESCE(s.name, 'Laundry Shop') as shop_name,
                        COALESCE(s.name, 'Laundry Shop') as shopName,
                        COALESCE(s.owner_name, 'DhobiPro Partner') as owner_name,
                        COALESCE(s.owner_name, 'DhobiPro Partner') as ownerName,
                        s.city as shop_city
                    FROM delivery_boys d
                    JOIN users u ON d.user_id = u.id
                    LEFT JOIN laundry_shops s ON d.shop_id = s.id";

            $params = [];
            if (!empty($shopId) && $shopId !== 'ALL' && $shopId !== 'all') {
                $sql .= " WHERE d.shop_id = :shop_id";
                $params[':shop_id'] = $shopId;
            }

            $sql .= " ORDER BY d.id DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $drivers = $stmt->fetchAll();

            // Real-time recalculation of assigned orders from orders table
            foreach ($drivers as &$dr) {
                try {
                    $cntStmt = $db->prepare("SELECT COUNT(*) FROM orders WHERE (delivery_boy_id = :bid OR delivery_boy_id = :uid) AND status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED')");
                    $cntStmt->execute([':bid' => $dr['id'], ':uid' => $dr['user_id']]);
                    $activeCount = (int)$cntStmt->fetchColumn();
                    $dr['assigned_orders'] = $activeCount;
                    $dr['assignedOrders']  = $activeCount;
                } catch (\Throwable $t) {}
            }
            unset($dr);

            return $drivers;
        } catch (\Throwable $e) {
            error_log("fetchDeliveryBoysFromDb error: " . $e->getMessage());
            return [];
        }
    }
}

if (!function_exists('saveDeliveryBoyToDb')) {
    /**
     * Store newly registered delivery boy directly in dhobi_db (users + delivery_boys tables).
     */
    function saveDeliveryBoyToDb(array $data): ?int {
        $db = getDb();
        if (!$db) return null;

        try {
            $name        = trim($data['name'] ?? 'Delivery Partner');
            $phone       = trim($data['phone'] ?? '');
            $email       = trim($data['email'] ?? '');
            $rawPass     = $data['password'] ?? '123456';
            $password    = password_hash($rawPass, PASSWORD_BCRYPT);
            $city        = trim($data['city'] ?? 'Pune');
            $shopId      = (int)($data['shopId'] ?? $data['shop_id'] ?? 30);
            $vType       = $data['vehicleType'] ?? $data['vehicle_type'] ?? 'Scooter';
            $vNumber     = strtoupper(trim($data['vehicleNumber'] ?? $data['vehicle_number'] ?? ''));
            $dlNumber    = strtoupper(trim($data['dlNumber'] ?? $data['dl_number'] ?? ''));

            // Check if user already exists with this phone or email
            $stmt = $db->prepare("SELECT id FROM users WHERE (phone = :phone AND phone != '') OR (email = :email AND email != '') LIMIT 1");
            $stmt->execute([':phone' => $phone, ':email' => $email]);
            $existingUser = $stmt->fetch();

            if ($existingUser) {
                $userId = (int)$existingUser['id'];
                // Update existing user to role delivery_boy
                $up = $db->prepare("UPDATE users SET name = :name, role = 'delivery_boy', city = :city, status = 'ACTIVE', is_verified = 1, is_active = 1, updated_at = NOW() WHERE id = :id");
                $up->execute([':name' => $name, ':city' => $city, ':id' => $userId]);
            } else {
                // Generate fallback email if empty
                if (empty($email)) {
                    $email = 'driver_' . preg_replace('/[^0-9]/', '', $phone) . '@dhobipro.com';
                }
                $ins = $db->prepare("INSERT INTO users (role, name, phone, email, password, city, status, is_verified, is_active, created_at, updated_at) 
                                     VALUES ('delivery_boy', :name, :phone, :email, :password, :city, 'ACTIVE', 1, 1, NOW(), NOW())");
                $ins->execute([
                    ':name'     => $name,
                    ':phone'    => $phone,
                    ':email'    => $email,
                    ':password' => $password,
                    ':city'     => $city
                ]);
                $userId = (int)$db->lastInsertId();
            }

            // Check if record exists in delivery_boys table
            $checkBoy = $db->prepare("SELECT id FROM delivery_boys WHERE user_id = :uid LIMIT 1");
            $checkBoy->execute([':uid' => $userId]);
            $existingBoy = $checkBoy->fetch();

            if ($existingBoy) {
                $boyId = (int)$existingBoy['id'];
                $upBoy = $db->prepare("UPDATE delivery_boys SET shop_id = :sid, vehicle_type = :vt, vehicle_number = :vn, license_number = :dl, is_online = 1, verification_status = 'approved', updated_at = NOW() WHERE id = :bid");
                $upBoy->execute([
                    ':sid' => $shopId,
                    ':vt'  => $vType,
                    ':vn'  => $vNumber,
                    ':dl'  => $dlNumber,
                    ':bid' => $boyId
                ]);
                return $boyId;
            } else {
                $insBoy = $db->prepare("INSERT INTO delivery_boys (user_id, shop_id, vehicle_type, vehicle_number, license_number, is_online, verification_status, rating, completed_orders_count, active_orders_count, created_at, updated_at)
                                        VALUES (:uid, :sid, :vt, :vn, :dl, 1, 'approved', 5.00, 0, 0, NOW(), NOW())");
                $insBoy->execute([
                    ':uid' => $userId,
                    ':sid' => $shopId,
                    ':vt'  => $vType,
                    ':vn'  => $vNumber,
                    ':dl'  => $dlNumber
                ]);
                return (int)$db->lastInsertId();
            }
        } catch (\Throwable $e) {
            error_log("saveDeliveryBoyToDb error: " . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('updateDeliveryBoyInDb')) {
    /**
     * Update existing delivery boy details in dhobi_db.
     */
    function updateDeliveryBoyInDb($id, array $data): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $stmt = $db->prepare("SELECT user_id FROM delivery_boys WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $boy = $stmt->fetch();
            if (!$boy) return false;

            $userId = (int)$boy['user_id'];
            $name   = trim($data['name'] ?? '');
            $phone  = trim($data['phone'] ?? '');
            $email  = trim($data['email'] ?? '');
            $city   = trim($data['city'] ?? '');
            $status = $data['account_status'] ?? $data['accountStatus'] ?? 'ACTIVE';

            $vType   = $data['vehicle_type'] ?? $data['vehicleType'] ?? 'Scooter';
            $vNumber = strtoupper(trim($data['vehicle_number'] ?? $data['vehicleNumber'] ?? ''));
            $dlNumber= strtoupper(trim($data['dl_number'] ?? $data['dlNumber'] ?? ''));
            $shopId  = !empty($data['shop_id']) ? (int)$data['shop_id'] : (!empty($data['shopId']) ? (int)$data['shopId'] : null);

            // Update user
            $upUser = $db->prepare("UPDATE users SET name = :name, phone = :phone, email = :email, city = :city, status = :status, updated_at = NOW() WHERE id = :uid");
            $upUser->execute([
                ':name'   => $name,
                ':phone'  => $phone,
                ':email'  => $email,
                ':city'   => $city,
                ':status' => $status,
                ':uid'    => $userId
            ]);

            // Update delivery_boys
            $sql = "UPDATE delivery_boys SET vehicle_type = :vt, vehicle_number = :vn, license_number = :dl, updated_at = NOW()";
            $params = [
                ':vt' => $vType,
                ':vn' => $vNumber,
                ':dl' => $dlNumber,
                ':id' => $id
            ];
            if ($shopId) {
                $sql .= ", shop_id = :sid";
                $params[':sid'] = $shopId;
            }
            $sql .= " WHERE id = :id";

            $upBoy = $db->prepare($sql);
            $upBoy->execute($params);

            return true;
        } catch (\Throwable $e) {
            error_log("updateDeliveryBoyInDb error: " . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('toggleDeliveryBoyStatusInDb')) {
    function toggleDeliveryBoyStatusInDb($id, string $status): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $stmt = $db->prepare("SELECT user_id FROM delivery_boys WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $boy = $stmt->fetch();
            if (!$boy) return false;

            $verStatus = ($status === 'ACTIVE') ? 'approved' : 'suspended';
            $db->prepare("UPDATE users SET status = :st, updated_at = NOW() WHERE id = :uid")
               ->execute([':st' => $status, ':uid' => $boy['user_id']]);

            $db->prepare("UPDATE delivery_boys SET verification_status = :vs, updated_at = NOW() WHERE id = :id")
               ->execute([':vs' => $verStatus, ':id' => $id]);

            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}

if (!function_exists('toggleDeliveryBoyDutyInDb')) {
    function toggleDeliveryBoyDutyInDb($id, bool $isOnline): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $db->prepare("UPDATE delivery_boys SET is_online = :online, updated_at = NOW() WHERE id = :id")
               ->execute([':online' => $isOnline ? 1 : 0, ':id' => $id]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}

if (!function_exists('deleteDeliveryBoyFromDb')) {
    function deleteDeliveryBoyFromDb($id): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $stmt = $db->prepare("SELECT user_id FROM delivery_boys WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $boy = $stmt->fetch();

            $db->prepare("DELETE FROM delivery_boys WHERE id = :id")->execute([':id' => $id]);
            if ($boy && !empty($boy['user_id'])) {
                $db->prepare("DELETE FROM users WHERE id = :uid AND role = 'delivery_boy'")->execute([':uid' => $boy['user_id']]);
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}

if (!function_exists('assignDriverToOrderInDb')) {
    /**
     * Dispatch and assign an order to a delivery partner in dhobi_db.
     */
    function assignDriverToOrderInDb($orderId, $driverInput, $driverName = null): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $driverUserId = null;

            // 1. If numeric, resolve user_id (since orders.delivery_boy_id references users.id)
            if (is_numeric($driverInput)) {
                $intId = (int)$driverInput;
                $stmt = $db->prepare("SELECT user_id FROM delivery_boys WHERE id = :id OR user_id = :uid LIMIT 1");
                $stmt->execute([':id' => $intId, ':uid' => $intId]);
                $row = $stmt->fetch();
                if ($row && !empty($row['user_id'])) {
                    $driverUserId = (int)$row['user_id'];
                } else {
                    $stmtU = $db->prepare("SELECT id FROM users WHERE id = :uid LIMIT 1");
                    $stmtU->execute([':uid' => $intId]);
                    $uRow = $stmtU->fetch();
                    if ($uRow) $driverUserId = (int)$uRow['id'];
                }
            }

            // 2. If not resolved yet, check by driverName
            if (!$driverUserId && !empty($driverName)) {
                $stmt = $db->prepare("SELECT d.user_id FROM delivery_boys d JOIN users u ON d.user_id = u.id WHERE u.name = :name LIMIT 1");
                $stmt->execute([':name' => $driverName]);
                $row = $stmt->fetch();
                if ($row) $driverUserId = (int)$row['user_id'];
            }

            // 3. Fallback: check if driverInput is a name string
            if (!$driverUserId && is_string($driverInput) && !empty($driverInput)) {
                $stmt = $db->prepare("SELECT d.user_id FROM delivery_boys d JOIN users u ON d.user_id = u.id WHERE u.name = :name LIMIT 1");
                $stmt->execute([':name' => $driverInput]);
                $row = $stmt->fetch();
                if ($row) $driverUserId = (int)$row['user_id'];
            }

            if ($driverUserId) {
                $up = $db->prepare("UPDATE orders 
                                    SET delivery_boy_id = :did, 
                                        status = 'OUT_FOR_DELIVERY', 
                                        updated_at = NOW() 
                                    WHERE id = :oid OR order_number = :onum");
                $up->execute([
                    ':did'  => $driverUserId,
                    ':oid'  => is_numeric($orderId) ? (int)$orderId : 0,
                    ':onum' => $orderId
                ]);

                // Also update or insert delivery_assignments
                try {
                    $oidInt = is_numeric($orderId) ? (int)$orderId : 0;
                    if ($oidInt <= 0) {
                        $oidStmt = $db->prepare("SELECT id FROM orders WHERE order_number = :onum LIMIT 1");
                        $oidStmt->execute([':onum' => $orderId]);
                        $oidInt = (int)$oidStmt->fetchColumn();
                    }
                    if ($oidInt > 0) {
                        $asStmt = $db->prepare("INSERT INTO delivery_assignments (order_id, delivery_boy_id, type, status, created_at, updated_at) 
                                                VALUES (:oid, :did, 'delivery', 'assigned', NOW(), NOW())");
                        $asStmt->execute([':oid' => $oidInt, ':did' => $driverUserId]);
                    }
                } catch (\Throwable $at) {}

                return true;
            }

            return false;
        } catch (\Throwable $e) {
            error_log("assignDriverToOrderInDb error: " . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('getDriverNameById')) {
    /**
     * Resolve delivery driver's display name by either users.id or delivery_boys.id.
     */
    function getDriverNameById($id): ?string {
        if (empty($id)) return null;
        $db = getDb();
        if (!$db) return null;
        try {
            $stmt = $db->prepare("SELECT name FROM users WHERE id = :id AND role = 'delivery_boy' 
                                  UNION 
                                  SELECT u.name FROM delivery_boys d JOIN users u ON d.user_id = u.id WHERE d.id = :did 
                                  LIMIT 1");
            $stmt->execute([':id' => $id, ':did' => $id]);
            $val = $stmt->fetchColumn();
            return $val ?: null;
        } catch (\Throwable $t) {
            return null;
        }
    }
}

if (!function_exists('updateOrderStatusInDb')) {
    /**
     * Update order status in dhobi_db.
     */
    function updateOrderStatusInDb($orderId, $status): bool {
        $db = getDb();
        if (!$db) return false;

        try {
            $up = $db->prepare("UPDATE orders 
                                SET status = :st, 
                                    updated_at = NOW() 
                                WHERE id = :oid OR order_number = :onum");
            $up->execute([
                ':st'   => $status,
                ':oid'  => is_numeric($orderId) ? (int)$orderId : 0,
                ':onum' => $orderId
            ]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
}

if (!function_exists('fetchOrdersFromDb')) {
    /**
     * Fetch real live orders from dhobi_db database.
     */
    function fetchOrdersFromDb($shopId = null, $status = null): array {
        $db = getDb();
        if (!$db) return [];

        try {
            $sql = "SELECT 
                        o.id,
                        o.order_number,
                        o.order_number as orderNumber,
                        o.user_id,
                        o.shop_id,
                        o.delivery_boy_id,
                        COALESCE(u.name, 'Customer') as customerName,
                        COALESCE(u.name, 'Customer') as customer_name,
                        COALESCE(u.phone, '') as customerPhone,
                        COALESCE(u.phone, '') as customer_phone,
                        COALESCE(s.name, 'Laundry Shop') as laundryName,
                        COALESCE(s.name, 'Laundry Shop') as shop_name,
                        COALESCE(s.owner_name, '') as owner_name,
                        COALESCE(s.phone, '') as shop_phone,
                        COALESCE(o.city, s.city, 'Pune') as city,
                        COALESCE(o.pickup_address, 'Pune') as pickupAddress,
                        COALESCE(o.pickup_address, 'Pune') as pickup_address,
                        COALESCE(o.delivery_address, o.pickup_address, 'Pune') as delivery_address,
                        COALESCE(o.total_amount, o.amount, o.total, 0) as amount,
                        COALESCE(o.total_amount, o.amount, o.total, 0) as total_amount,
                        COALESCE(o.total_amount, o.amount, o.total, 0) as total,
                        UPPER(COALESCE(o.payment_method, 'COD')) as paymentMethod,
                        UPPER(COALESCE(o.payment_method, 'COD')) as payment_method,
                        UPPER(COALESCE(o.payment_status, 'PENDING')) as paymentStatus,
                        UPPER(COALESCE(o.payment_status, 'PENDING')) as payment_status,
                        UPPER(COALESCE(o.status, 'PENDING')) as status,
                        COALESCE(du.name, dbu.name, 'Unassigned') as deliveryBoyName,
                        COALESCE(du.name, dbu.name, 'Unassigned') as delivery_boy_name,
                        COALESCE(du.phone, dbu.phone, '') as delivery_boy_phone,
                        DATE_FORMAT(o.created_at, '%d %b %Y %h:%i %p') as createdAt,
                        o.created_at,
                        o.notes,
                        o.customer_available,
                        o.customer_availability_notes
                    FROM orders o
                    LEFT JOIN users u ON o.user_id = u.id
                    LEFT JOIN laundry_shops s ON o.shop_id = s.id
                    LEFT JOIN users du ON o.delivery_boy_id = du.id
                    LEFT JOIN delivery_boys db ON o.delivery_boy_id = db.id
                    LEFT JOIN users dbu ON db.user_id = dbu.id";

            $where = [];
            $params = [];

            if (!empty($shopId) && $shopId !== 'ALL' && $shopId !== 'all') {
                $where[] = "o.shop_id = :shop_id";
                $params[':shop_id'] = $shopId;
            }

            if (!empty($status) && $status !== 'ALL' && $status !== 'all') {
                $where[] = "UPPER(o.status) = :status";
                $params[':status'] = strtoupper($status);
            }

            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }

            $sql .= " ORDER BY o.id DESC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch order items for each order
            foreach ($orders as &$ord) {
                try {
                    $itemStmt = $db->prepare("SELECT item_name as name, item_name, service_name, quantity, unit_price, total_price FROM order_items WHERE order_id = :oid");
                    $itemStmt->execute([':oid' => $ord['id']]);
                    $ord['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                } catch (\Throwable $t) {
                    $ord['items'] = [];
                }
            }
            unset($ord);

            return $orders;
        } catch (\Throwable $e) {
            error_log("fetchOrdersFromDb error: " . $e->getMessage());
            return [];
        }
    }
}
