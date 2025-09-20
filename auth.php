<?php
require_once 'config.php';
session_start();

// 处理请求
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = $input['action'] ?? '';

if ($action === 'register') {
    registerUser($input);
} elseif ($action === 'login') {
    loginUser($input);
} else {
    echo json_encode(['success' => false, 'message' => '无效操作']);
}

function registerUser($data) {
    global $pdo;
    
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');
    $email = trim($data['email'] ?? '');
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
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

function loginUser($data) {
    global $pdo;
    
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => '用户名和密码不能为空']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            
            echo json_encode([
                'success' => true, 
                'message' => '登录成功',
                'userId' => $user['id'],
                'username' => $user['username']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => '用户名或密码错误']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => '登录失败: ' . $e->getMessage()]);
    }
}
?>