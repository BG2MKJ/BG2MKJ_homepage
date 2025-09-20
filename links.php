<?php
header('Content-Type: application/json');
session_start();

// 数据库配置
require_once 'config.php';

// 验证用户是否登录
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => '未登录']);
    exit;
}

$userId = $_SESSION['user_id'];
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
    
    $name = trim($_POST['name'] ?? '');
    $url = trim($_POST['url'] ?? '');
    
    if (empty($name) || empty($url)) {
        echo json_encode(['success' => false, 'message' => '链接名称和地址不能为空']);
        return;
    }
    
    // 确保URL格式正确
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        // 尝试添加http://前缀
        if (!filter_var('http://' . $url, FILTER_VALIDATE_URL)) {
            echo json_encode(['success' => false, 'message' => '无效的URL格式']);
            return;
        }
        $url = 'http://' . $url;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO user_links (user_id, name, url) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $name, $url]);
        
        echo json_encode(['success' => true]);
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
        $stmt = $pdo->prepare("DELETE FROM user_links WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        error_log("删除链接错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '删除链接失败']);
    }
}
?>