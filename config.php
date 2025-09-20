<?php
// 启用错误显示（仅用于开发环境）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 数据库配置 (XAMPP默认配置)
$host = 'localhost';
$dbname = 'bg2mkj';
$username = 'bg2mkj';
$password = 'lhw20050920'; // XAMPP默认密码为空

// 跨域设置
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}


try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false, 
        'message' => '数据库连接失败: ' . $e->getMessage()
    ]);
    exit;
}
?>