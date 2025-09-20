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
        getTodos($userId);
        break;
    case 'add':
        addTodo($userId);
        break;
    case 'complete':
        completeTodo($userId);
        break;
    case 'delete':
        deleteTodo($userId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效操作']);
}

// 获取待办事项
function getTodos($userId) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT id, text, completed FROM todos WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $todos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'todos' => $todos]);
    } catch (PDOException $e) {
        error_log("获取待办错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '获取待办失败']);
    }
}

// 添加待办事项
function addTodo($userId) {
    global $pdo;
    
    $text = trim($_POST['text'] ?? '');
    
    if (empty($text)) {
        echo json_encode(['success' => false, 'message' => '待办内容不能为空']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO todos (user_id, text) VALUES (?, ?)");
        $stmt->execute([$userId, $text]);
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        error_log("添加待办错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '添加待办失败']);
    }
}

// 完成待办事项（并删除）
function completeTodo($userId) {
    global $pdo;
    
    $id = $_POST['id'] ?? 0;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => '无效的待办ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        error_log("完成待办错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '操作失败']);
    }
}

// 删除待办事项
function deleteTodo($userId) {
    global $pdo;
    
    $id = $_POST['id'] ?? 0;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => '无效的待办ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM todos WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        error_log("删除待办错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '删除失败']);
    }
}
?>