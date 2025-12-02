<?php
require_once 'config.php';
// 注意：Content-Type已在config.php中设置，这里不再重复设置
// 移除session_start()，完全依赖数据库会话管理，避免虚拟主机会话限制

// 处理请求 - 直接使用$_POST，因为前端发送的是表单数据格式
$input = $_POST;
$action = $input['action'] ?? '';

// 添加token验证操作
if ($action === 'validate_token') {
    validateTokenRequest($input);
} elseif ($action === 'register') {
    registerUser($input);
} elseif ($action === 'login') {
    loginUser($input);
} elseif ($action === 'logout') {
    logoutUser($input);
} elseif ($action === 'logout_all') {
    logoutAllDevices($input);
} else {
    echo json_encode(['success' => false, 'message' => '无效操作']);
}

// Token验证请求
function validateTokenRequest($data) {
    global $pdo;
    
    $token = $data['token'] ?? '';
    
    if (empty($token)) {
        // error_log("Token验证失败: Token为空");
        echo json_encode(['success' => false, 'message' => 'Token不能为空']);
        return;
    }
    
    // error_log("Token验证请求: Token=" . substr($token, 0, 10) . "...");
    
    $session = validateToken($pdo, $token);
    if ($session) {
        // error_log("Token验证成功: 用户 {$session['username']} (ID: {$session['user_id']})");
        // error_log("会话状态: 创建时间={$session['created_at']}, 过期时间={$session['expires_at']}, 最后活动={$session['last_activity']}");
        
        echo json_encode([
            'success' => true, 
            'user' => [
                'id' => $session['user_id'],
                'username' => $session['username']
            ]
        ]);
    } else {
        // error_log("Token验证失败: Token无效或已过期");
        
        // 查询token是否存在但已过期
        $stmt = $pdo->prepare("SELECT user_id, expires_at FROM user_sessions WHERE session_token = ?");
        $stmt->execute([$token]);
        $expiredSession = $stmt->fetch();
        
        if ($expiredSession) {
            // error_log("Token状态: 会话存在但已过期，过期时间={$expiredSession['expires_at']}");
        } else {
            // error_log("Token状态: 会话不存在");
        }
        
        echo json_encode(['success' => false, 'message' => 'Token无效或已过期']);
    }
}

// 用户注册
function registerUser($data) {
    global $pdo;
    
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');
    $email = trim($data['email'] ?? '');
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }
    
    if (strlen($username) < 3 || strlen($username) > 50) {
        echo json_encode(['success' => false, 'message' => '用户名长度必须在3-50个字符之间']);
        return;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => '密码长度至少6个字符']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => '用户名已存在']);
            return;
        }
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $email]);
        
        echo json_encode(['success' => true, 'message' => '注册成功']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => '注册失败: ' . $e->getMessage()]);
    }
}

// 用户登录
function loginUser($data) {
    global $pdo;
    
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');
    $deviceInfo = $data['device_info'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    if (empty($username) || empty($password)) {
        error_log("登录失败: 用户名或密码为空");
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }
    
    try {
        //error_log("登录尝试: 用户 {$username} 正在尝试登录");
        
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            //error_log("登录成功: 用户 {$username} (ID: {$user['id']}) 密码验证通过");
            
            // 创建会话token
            $token = createUserSession($pdo, $user['id'], $deviceInfo);
            
            if ($token) {
                // 查询新创建的会话详情
                $sessionStmt = $pdo->prepare("SELECT created_at, expires_at FROM user_sessions WHERE session_token = ?");
                $sessionStmt->execute([$token]);
                $session = $sessionStmt->fetch();
                
                //error_log("会话创建成功: 用户 {$username} (ID: {$user['id']})");
                //error_log("会话详情: Token=" . substr($token, 0, 10) . "..., 创建时间={$session['created_at']}, 过期时间={$session['expires_at']}");
                //error_log("设备信息: {$deviceInfo}");
                
                echo json_encode([
                    'success' => true, 
                    'message' => '登录成功',
                    'userId' => $user['id'],
                    'username' => $user['username'],
                    'token' => $token,
                    'expires_in' => 30 * 24 * 60 * 60 // 30天秒数
                ]);
            } else {
                error_log("会话创建失败: 用户 {$username} (ID: {$user['id']})");
                echo json_encode(['success' => false, 'message' => '创建会话失败']);
            }
        } else {
            error_log("登录失败: 用户 {$username} 密码验证失败");
            echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
        }
    } catch (PDOException $e) {
        error_log("登录异常: 用户 {$username} - " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '登录失败: ' . $e->getMessage()]);
    }
}

// 用户退出当前设备
function logoutUser($data) {
    global $pdo;
    
    $token = $data['token'] ?? '';
    
    if (!empty($token)) {
        deleteUserSession($pdo, $token);
    }
    
    echo json_encode(['success' => true, 'message' => '退出成功']);
}

// 用户退出所有设备
function logoutAllDevices($data) {
    global $pdo;
    
    $token = $data['token'] ?? '';
    $userId = $data['user_id'] ?? 0;
    
    if ($userId) {
        deleteAllUserSessions($pdo, $userId);
        session_destroy();
        echo json_encode(['success' => true, 'message' => '已退出所有设备']);
    } else {
        echo json_encode(['success' => false, 'message' => '用户ID不能为空']);
    }
}
?>
