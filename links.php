<?php
require_once 'config.php';
// Content-Type已在config.php中设置，这里不再重复设置

// 验证用户是否登录（支持session和token两种方式）
$userId = null;
// 首先尝试从POST和GET中获取token
$token = $_POST['token'] ?? $_GET['token'] ?? '';

// 虚拟主机环境下的验证逻辑优化
if (!empty($token)) {
    // Token验证方式 - 这是前端主要使用的方式
    $session = validateToken($pdo, $token);
    if ($session) {
        $userId = $session['user_id'];
    } else {
        // Token无效时记录错误以便调试
        error_log("无效的token: $token");
    }
} else {
    // Session验证方式（向后兼容）
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
}

if (!$userId) {
    echo json_encode(['success' => false, 'message' => '未登录或会话已过期']);
    exit;
}

$action = $_POST['action'] ?? '';

// 处理不同操作
switch ($action) {
    case 'get':
        getLinks($userId);
        break;
    case 'add':
        addLink($userId);
        break;
    case 'delete':
        deleteLink($userId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效操作']);
}

// 获取用户链接
function getLinks($userId) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT id, name, url FROM user_links WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'links' => $links]);
    } catch (PDOException $e) {
        error_log("获取链接错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '获取链接失败']);
    }
}

// 添加用户链接
function addLink($userId) {
    global $pdo;
    
    // 直接使用$_POST获取表单数据
    $name = trim($_POST['name'] ?? '');
    $url = trim($_POST['url'] ?? '');
    
    if (empty($name) || empty($url)) {
        echo json_encode(['success' => false, 'message' => '链接名称和地址不能为空']);
        return;
    }
    
    // 验证链接名称长度
    if (strlen($name) > 100) {
        echo json_encode(['success' => false, 'message' => '链接名称不能超过100个字符']);
        return;
    }
    
    // 确保URL格式正确
    if (!preg_match('/^https?:\/\//', $url)) {
        $url = 'https://' . $url;
    }
    
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        echo json_encode(['success' => false, 'message' => '无效的URL格式']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO user_links (user_id, name, url) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $name, $url]);
        
        echo json_encode(['success' => true, 'message' => '链接添加成功']);
    } catch (PDOException $e) {
        error_log("添加链接错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '添加链接失败']);
    }
}

// 删除用户链接
function deleteLink($userId) {
    global $pdo;
    
    $id = $_POST['id'] ?? 0;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => '无效的链接ID']);
        return;
    }
    
    try {
        // 先验证链接属于该用户
        $stmt = $pdo->prepare("SELECT id FROM user_links WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => '链接不存在或无权操作']);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM user_links WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        echo json_encode(['success' => true, 'message' => '链接删除成功']);
    } catch (PDOException $e) {
        error_log("删除链接错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '删除链接失败']);
    }
}
?>
