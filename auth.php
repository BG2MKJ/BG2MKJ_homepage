<?php
require_once 'config.php';
// 注意：Content-Type已在config.php中设置，这里不再重复设置
session_start();

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
        echo json_encode(['success' => false, 'message' => 'Token不能为空']);
        return;
    }
    
    $session = validateToken($pdo, $token);
    if ($session) {
        echo json_encode([
            'success' => true, 
            'user' => [
                'id' => $session['user_id'],
                'username' => $session['username']
            ]
        ]);
    } else {
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
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // 创建会话token
            $token = createUserSession($pdo, $user['id'], $deviceInfo);
            
            if ($token) {
                // 设置PHP会话
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['token'] = $token;
                
                echo json_encode([
                    'success' => true, 
                    'message' => '登录成功',
                    'userId' => $user['id'],
                    'username' => $user['username'],
                    'token' => $token,
                    'expires_in' => 30 * 24 * 60 * 60 // 30天秒数
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => '创建会话失败']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
        }
    } catch (PDOException $e) {
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
    
    // 清除PHP会话
    session_destroy();
    
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
