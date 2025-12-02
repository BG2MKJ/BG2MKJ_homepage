<?php
require_once 'config.php';

// 验证用户是否登录
$userId = null;
$token = $_POST['token'] ?? $_GET['token'] ?? '';

if (!empty($token)) {
    $session = validateToken($pdo, $token);
    if ($session) {
        $userId = $session['user_id'];
    }
}

if (!$userId) {
    echo json_encode([
        'success' => false, 
        'message' => '用户未登录',
        'error_type' => 'not_logged_in',
        'requires_login' => true
    ]);
    exit;
}

$action = $_POST['action'] ?? '';

if ($action === 'query') {
    queryWord();
} else {
    echo json_encode(['success' => false, 'message' => '无效操作']);
}

function queryWord() {
    global $pdo;
    
    $word = trim($_POST['word'] ?? '');
    
    if (empty($word)) {
        echo json_encode(['success' => false, 'message' => '单词不能为空']);
        return;
    }
    
    try {
        // 使用LOWER()进行不区分大小写的精确匹配
        $stmt = $pdo->prepare("
            SELECT id, word, en_pronunciation, us_pronunciation, `desc` 
            FROM words 
            WHERE LOWER(word) = LOWER(?)
        ");
        $stmt->execute([$word]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo json_encode(['success' => true, 'data' => $result]);
        } else {
            echo json_encode(['success' => false, 'message' => '未找到该单词']);
        }
    } catch (PDOException $e) {
        error_log("查询单词错误: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => '查询失败，请稍后重试']);
    }
}
?>
