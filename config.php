<?php
// 启用错误显示（仅用于开发环境）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 会话配置 - 虚拟主机环境优化
ini_set('session.gc_maxlifetime', 86400 * 30); // 30天
ini_set('session.cookie_lifetime', 86400 * 30); // 30天
ini_set('session.use_only_cookies', 1); // 仅使用cookie存储会话ID
ini_set('session.cookie_httponly', 1); // 防止JavaScript访问cookie
ini_set('session.use_trans_sid', 0); // 禁用URL中的会话ID传输
// 在虚拟主机上，可能不支持https，所以暂时不设置session.cookie_secure = 1

// 数据库配置 - 虚拟主机环境
// 注意：在虚拟主机上，用户名通常与cPanel用户名相同，
// 数据库名可能需要包含用户名前缀，如username_bg2mkj
$host = 'localhost'; // 虚拟主机通常使用localhost
$dbname = 'bg2mkj'; // 可能需要改为带前缀的数据库名
$username = 'bg2mkj'; // 通常是cPanel用户名
$password = 'lhw20050920'; // 数据库密码

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
    // 虚拟主机环境下的错误处理 - 提供更详细的诊断信息
    $errorCode = $e->getCode();
    $errorMsg = '';
    
    // 根据错误代码提供更具体的错误信息
    switch($errorCode) {
        case 1045:
            $errorMsg = '数据库连接失败: 用户名或密码错误。在虚拟主机上，请确认用户名是否为cPanel用户名，密码是否正确。';
            break;
        case 1049:
            $errorMsg = '数据库连接失败: 数据库不存在。在虚拟主机上，数据库名通常需要包含用户名前缀，如username_bg2mkj。';
            break;
        case 2002:
            $errorMsg = '数据库连接失败: 无法连接到MySQL服务器。请确认主机地址是否正确。';
            break;
        default:
            $errorMsg = "数据库连接失败 [错误代码: $errorCode]: " . $e->getMessage();
    }
    
    // 保留原始错误信息以便调试
    error_log("数据库连接错误: " . $e->getMessage());
    
    // 清理输出缓冲并返回错误信息
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false, 
        'message' => $errorMsg,
        'error_code' => $errorCode,
        'host' => $host,
        'dbname' => $dbname,
        'username' => $username
    ]);
    exit;
}

// Token生成函数
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// 验证用户token
function validateToken($pdo, $token) {
    try {
        $stmt = $pdo->prepare("
            SELECT us.*, u.username 
            FROM user_sessions us 
            JOIN users u ON us.user_id = u.id 
            WHERE us.session_token = ? AND us.expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if ($session) {
            // 更新最后活动时间
            $updateStmt = $pdo->prepare("UPDATE user_sessions SET last_activity = NOW() WHERE id = ?");
            $updateStmt->execute([$session['id']]);
            
            return $session;
        }
        return false;
    } catch (PDOException $e) {
        error_log("Token验证错误: " . $e->getMessage());
        return false;
    }
}

// 创建用户会话
function createUserSession($pdo, $userId, $deviceInfo = '') {
    $token = generateToken();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO user_sessions (user_id, session_token, device_info, expires_at) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $token, $deviceInfo, $expiresAt]);
        
        return $token;
    } catch (PDOException $e) {
        error_log("创建会话错误: " . $e->getMessage());
        return false;
    }
}

// 删除用户的所有会话（用于强制退出所有设备）
function deleteAllUserSessions($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ?");
        $stmt->execute([$userId]);
        return true;
    } catch (PDOException $e) {
        error_log("删除用户会话错误: " . $e->getMessage());
        return false;
    }
}

// 删除特定token的会话
function deleteUserSession($pdo, $token) {
    try {
        $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE session_token = ?");
        $stmt->execute([$token]);
        return true;
    } catch (PDOException $e) {
        error_log("删除会话错误: " . $e->getMessage());
        return false;
    }
}

// 删除过期会话
function cleanupExpiredSessions($pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE expires_at <= NOW()");
        $stmt->execute();
    } catch (PDOException $e) {
        error_log("清理会话错误: " . $e->getMessage());
    }
}

// 定期清理过期会话（每次有10%的概率执行）
if (rand(1, 10) === 1) {
    cleanupExpiredSessions($pdo);
}
?>