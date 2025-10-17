const VERSION = "2.0.0";
const MODIFY = 20250920;

// 全局变量
let currentUser = null;
let isEditingSchedule = false;
let todos = [];
let links = [];

// DOM加载完成后执行
document.addEventListener("DOMContentLoaded", function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    checkAuthStatus();
    setupEventListeners();
    initializeFeatures();
}

// 检查认证状态
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (token && userId && username) {
        currentUser = { id: userId, username: username };
        showMainContent();
        loadUserData();
    } else {
        showAuthForm();
    }
}

// 记录错误到日志面板
function logError(message) {
    const logPanel = document.getElementById('error-log-panel');
    const logContent = document.getElementById('error-log-content');
    const time = new Date().toLocaleTimeString();
    logContent.innerHTML += `[${time}] ${message}\n`;
    logPanel.classList.remove('hidden'); // 显示错误面板
}

// 显示认证表单
function showAuthForm() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
    
    // 设置标签切换
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.getElementById('login-form').classList.toggle('hidden', this.dataset.tab !== 'login');
            document.getElementById('register-form').classList.toggle('hidden', this.dataset.tab !== 'register');
        });
    });
    
    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        loginUser(username, password);
    });
    
    // 注册表单提交
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const email = document.getElementById('register-email').value;
        registerUser(username, password, email);
    });
}

// 显示主内容
function showMainContent() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('username-display').textContent = ` - ${currentUser.username}`;
}

// 设置事件监听器
function setupEventListeners() {
    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    
    // 自定义链接
    document.getElementById('add-link-btn').addEventListener('click', addCustomLink);
    
    // 待办事项
    document.getElementById('add-todo-btn').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTodo();
    });
    
    // 日程表编辑
    document.getElementById('edit-schedule-btn').addEventListener('click', enableScheduleEditing);
    document.getElementById('save-schedule-btn').addEventListener('click', saveSchedule);
    document.getElementById('cancel-edit-btn').addEventListener('click', cancelScheduleEditing);
    
    // 倒计时
    document.getElementById('modify-countdown').addEventListener('click', showDateSelector);
    document.getElementById('countdown-date').addEventListener('change', updateCountdown);
}

// 初始化功能
function initializeFeatures() {
    showVersion();
    updateTime();
    setInterval(updateTime, 1000);
    updateNetworkStatus();
    setInterval(updateNetworkStatus, 5000);
    initializeCountdown();
    loadSchedule();
}

function makeRequest(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest' // 添加此头部以识别为AJAX请求
        },
        body: new URLSearchParams(data),
        credentials: 'same-origin' // 使用同域凭证，而不是cors模式
    })
    .then(response => {
        // 捕获HTTP错误状态（4xx/5xx）
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`请求失败 [${response.status}]: ${text.substring(0, 200)}`);
            });
        }
        // 先获取文本再解析JSON，避免解析失败时丢失响应内容
        return response.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                // 记录无效JSON的原始内容（关键排查信息）
                console.error(`解析JSON失败 (${url}):`, text);
                throw new Error(`服务器返回格式错误: ${e.message}`);
            }
        });
    })
    .catch(error => {
        // 详细记录错误信息到日志面板
        const errorDetails = `请求URL: ${url}\n错误信息: ${error.message}\n错误类型: ${error.name}`;
        logError(errorDetails);
        
        // 详细分类错误类型，提供针对性的错误提示
        let errorMsg = '';
        
        // 1. 按错误名称分类
        switch(error.name) {
            case 'SyntaxError':
                errorMsg = '语法错误：服务器返回的数据格式错误，请检查PHP文件输出是否为有效的JSON格式';
                break;
            case 'TypeError':
                errorMsg = '类型错误：请求处理过程中发生类型错误，请检查数据类型是否正确';
                break;
            case 'RangeError':
                errorMsg = '范围错误：请求参数超出有效范围，请检查输入数据是否合法';
                break;
            case 'AbortError':
                errorMsg = '请求被中止：可能是网络不稳定或用户操作中断了请求';
                break;
            case 'DOMException':
                errorMsg = 'DOM错误：浏览器DOM操作失败，可能是浏览器兼容性问题';
                break;
            default:
                // 继续检查其他错误类型
                if (error.message) {
                    // 2. 按错误消息内容分类
                    if (error.message.includes('JSON')) {
                        errorMsg = '数据格式错误：服务器返回了无效的JSON格式数据，请检查PHP文件是否正常工作';
                    } else if (error.message.includes('404')) {
                        errorMsg = '文件不存在错误：请求的PHP文件未找到，请确认文件已正确上传到虚拟主机';
                    } else if (error.message.includes('403')) {
                        errorMsg = '权限错误：服务器拒绝访问请求，请检查用户权限设置';
                    } else if (error.message.includes('500')) {
                        errorMsg = '服务器错误：PHP代码执行出错，请联系管理员检查服务器日志';
                    } else if (error.message.includes('502')) {
                        errorMsg = '网关错误：服务器作为网关收到了无效响应，请稍后再试';
                    } else if (error.message.includes('503')) {
                        errorMsg = '服务不可用：服务器暂时无法处理请求，可能是服务器负载过高';
                    } else if (error.message.includes('Failed to fetch')) {
                        errorMsg = '连接错误：无法连接到服务器，请检查虚拟主机是否正常运行或网络连接是否稳定';
                    } else if (error.message.includes('timeout')) {
                        errorMsg = '请求超时：服务器响应时间过长，请稍后再试或检查服务器负载';
                    } else if (error.message.includes('NetworkError')) {
                        errorMsg = '网络错误：浏览器无法建立网络连接，请检查您的网络连接或防火墙设置';
                    } else if (error.message.includes('Connection refused')) {
                        errorMsg = '连接被拒绝：服务器拒绝了连接请求，请确认虚拟主机服务正常运行';
                    } else if (error.message.includes('Access-Control')) {
                        errorMsg = '跨域错误：浏览器的跨域安全策略阻止了请求，请检查服务器的CORS设置';
                    }
                }
                
                // 3. 如果没有匹配到具体错误类型，提供通用错误信息
                if (!errorMsg) {
                    errorMsg = '请求处理异常：发生未知错误，错误类型: ' + (error.name || '未知');
                    if (error.code) {
                        errorMsg += ', 错误代码: ' + error.code;
                    }
                }
        }
        
        // 打印详细错误到控制台以便调试
        console.error('请求错误详情:', {
            url: url,
            error: error,
            data: data,
            stack: error.stack
        });
        
        return { 
            success: false, 
            message: errorMsg, 
            originalError: error.message,
            errorType: error.name,
            requestUrl: url
        };
    });
}

// 用户登录
function loginUser(username, password) {
    // 前端预校验
    if (!username.trim() || !password.trim()) {
        showMessage('用户名和密码不能为空', 'error');
        return;
    }
    makeRequest('auth.php', {
        action: 'login',
        username: username,
        password: password
    }).then(data => {
        if (data.success) {
            // 校验返回数据完整性
            if (!data.userId || !data.username || !data.token) {
                showMessage('登录信息不完整', 'error');
                console.error('登录响应缺少必要字段:', data);
                return;
            }
            localStorage.setItem('authToken', data.token); // 修复之前的模拟token问题
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            currentUser = { id: data.userId, username: data.username };
            showMainContent();
            loadUserData();
        } else {
            showMessage(data.message || '登录失败', 'error');
        }
    });
}
// 用户注册
function registerUser(username, password, email) {
    // 前端预校验
    if (username.length < 3 || username.length > 50) {
        showMessage('用户名长度必须在3-50个字符之间', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage('密码长度至少6个字符', 'error');
        return;
    }
    makeRequest('auth.php', {
        action: 'register',
        username: username,
        password: password,
        email: email || ''
    }).then(data => {
        if (data.success) {
            showMessage('注册成功，请登录', 'success');
            document.querySelector('.tab-btn[data-tab="login"]').click();
        } else {
            showMessage(data.message || '注册失败', 'error');
        }
    });
}

// 退出登录
function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    currentUser = null;
    showAuthForm();
}

// 显示消息
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }, 3000);
}

// 加载用户数据
function loadUserData() {
    loadTodos();
    loadLinks();
    loadCountdownSettings();
}

// 加载链接
function loadLinks() {
    if (!currentUser) return;
    
    setSyncStatus('link', 'warning');
    makeRequest('links.php', {
        action: 'get',
        userId: currentUser.id
    }).then(data => {
        if (data.success) {
            links = data.links;
            renderLinks();
            setSyncStatus('link', 'success');
        } else {
            console.error('Load links error:', data.message);
            setSyncStatus('link', 'error');
        }
    }).catch(() => {
        setSyncStatus('link', 'error');
    });
}

// 渲染链接
function renderLinks() {
    const linksGrid = document.getElementById('links-grid');
    linksGrid.innerHTML = '';
    
    if (links.length === 0) {
        linksGrid.innerHTML = '<div class="no-links">暂无链接，请添加</div>';
        return;
    }
    
    links.forEach(link => {
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';
        linkItem.dataset.id = link.id;
        
        linkItem.innerHTML = `
            <a href="${link.url}" target="_blank">${link.name}</a>
            <button class="link-delete">×</button>
        `;
        
        // 删除链接
        const deleteBtn = linkItem.querySelector('.link-delete');
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            deleteLink(link.id);
        });
        
        linksGrid.appendChild(linkItem);
    });
}

// 添加自定义链接
function addCustomLink() {
    const nameInput = document.getElementById('link-name-input');
    const urlInput = document.getElementById('link-url-input');
    
    const linkName = nameInput.value.trim();
    const linkUrl = urlInput.value.trim();
    
    if (!linkName || !linkUrl) {
        alert('链接名称和地址不能为空');
        return;
    }
    
    setSyncStatus('link', 'warning');
    makeRequest('links.php', {
        action: 'add',
        userId: currentUser.id,
        name: linkName,
        url: linkUrl
    }).then(data => {
        if (data.success) {
            nameInput.value = '';
            urlInput.value = '';
            loadLinks();
            setSyncStatus('link', 'success');
        } else {
            alert('添加链接失败: ' + data.message);
            setSyncStatus('link', 'error');
        }
    }).catch(() => {
        setSyncStatus('link', 'error');
    });
}

// 删除链接
function deleteLink(linkId) {
    if (!confirm('确定要删除这个链接吗？')) return;
    
    setSyncStatus('link', 'warning');
    makeRequest('links.php', {
        action: 'delete',
        userId: currentUser.id,
        id: linkId
    }).then(data => {
        if (data.success) {
            loadLinks();
            setSyncStatus('link', 'success');
        } else {
            alert('删除链接失败: ' + data.message);
            setSyncStatus('link', 'error');
        }
    }).catch(() => {
        setSyncStatus('link', 'error');
    });
}

// 添加待办事项
function addTodo() {
    const todoInput = document.getElementById('todo-input');
    const todoText = todoInput.value.trim();
    
    if (todoText) {
        setSyncStatus('todo', 'warning');
        makeRequest('todo.php', {
            action: 'add',
            userId: currentUser.id,
            text: todoText
        }).then(data => {
            if (data.success) {
                todoInput.value = '';
                loadTodos();
                setSyncStatus('todo', 'success');
            } else {
                alert('添加待办失败: ' + data.message);
                setSyncStatus('todo', 'error');
            }
        }).catch(() => {
            setSyncStatus('todo', 'error');
        });
    }
}

// 加载待办事项
function loadTodos() {
    if (!currentUser) return;
    
    setSyncStatus('todo', 'warning');
    makeRequest('todo.php', {
        action: 'get',
        userId: currentUser.id
    }).then(data => {
        if (data.success) {
            todos = data.todos;
            renderTodos();
            setSyncStatus('todo', 'success');
        } else {
            console.error('Load todos error:', data.message);
            setSyncStatus('todo', 'error');
        }
    }).catch(() => {
        setSyncStatus('todo', 'error');
    });
}

// 渲染待办事项
function renderTodos() {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    
    if (todos.length === 0) {
        todoList.innerHTML = '<div class="no-todos">暂无待办事项</div>';
        return;
    }
    
    todos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item`;
        todoItem.dataset.id = todo.id;
        
        todoItem.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${todo.text}</span>
            <button class="todo-delete">×</button>
        `;
        
        // 切换完成状态 - 完成后立即删除
        const checkbox = todoItem.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                completeTodo(todo.id);
            }
        });
        
        // 删除待办
        const deleteBtn = todoItem.querySelector('.todo-delete');
        deleteBtn.addEventListener('click', function() {
            deleteTodo(todo.id);
        });
        
        todoList.appendChild(todoItem);
    });
}

// 完成待办事项（并删除）
function completeTodo(todoId) {
    setSyncStatus('todo', 'warning');
    makeRequest('todo.php', {
        action: 'complete',
        userId: currentUser.id,
        id: todoId
    }).then(data => {
        if (data.success) {
            loadTodos();
            setSyncStatus('todo', 'success');
        } else {
            alert('操作失败: ' + data.message);
            loadTodos(); // 重新加载以恢复状态
            setSyncStatus('todo', 'error');
        }
    }).catch(() => {
        loadTodos();
        setSyncStatus('todo', 'error');
    });
}

// 删除待办
function deleteTodo(todoId) {
    setSyncStatus('todo', 'warning');
    makeRequest('todo.php', {
        action: 'delete',
        userId: currentUser.id,
        id: todoId
    }).then(data => {
        if (data.success) {
            loadTodos();
            setSyncStatus('todo', 'success');
        } else {
            alert('删除待办失败: ' + data.message);
            setSyncStatus('todo', 'error');
        }
    }).catch(() => {
        setSyncStatus('todo', 'error');
    });
}

// 设置同步状态指示灯
function setSyncStatus(type, status) {
    const element = document.getElementById(`${type}-sync-light`);
    if (!element) return;
    
    // 移除所有状态类
    element.classList.remove('success', 'error', 'warning');
    // 添加当前状态类
    element.classList.add(status);
}

// 启用日程表编辑
function enableScheduleEditing() {
    const cells = document.querySelectorAll('.data-cell');
    cells.forEach(cell => {
        cell.contentEditable = 'true';
    });
    
    isEditingSchedule = true;
    document.getElementById('edit-schedule-btn').classList.add('hidden');
    document.getElementById('save-schedule-btn').classList.remove('hidden');
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

// 保存日程表
function saveSchedule() {
    const scheduleData = [];
    const rows = document.querySelectorAll('#schedule-table tbody tr');
    
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            if (cell.classList.contains('data-cell')) {
                rowData.push(cell.textContent);
            }
        });
        scheduleData.push(rowData);
    });
    
    localStorage.setItem(`schedule_${currentUser.id}`, JSON.stringify(scheduleData));
    
    const cells = document.querySelectorAll('.data-cell');
    cells.forEach(cell => {
        cell.contentEditable = 'false';
    });
    
    isEditingSchedule = false;
    document.getElementById('edit-schedule-btn').classList.remove('hidden');
    document.getElementById('save-schedule-btn').classList.add('hidden');
    document.getElementById('cancel-edit-btn').classList.add('hidden');
    
    alert('日程已保存');
}

// 取消日程编辑
function cancelScheduleEditing() {
    loadSchedule();
    
    const cells = document.querySelectorAll('.data-cell');
    cells.forEach(cell => {
        cell.contentEditable = 'false';
    });
    
    isEditingSchedule = false;
    document.getElementById('edit-schedule-btn').classList.remove('hidden');
    document.getElementById('save-schedule-btn').classList.add('hidden');
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

// 加载日程表
function loadSchedule() {

    if (!currentUser || !currentUser.id) {
        console.warn('用户信息未加载，无法加载日程');
        return; // 终止执行，避免报错
    }


    const savedData = localStorage.getItem(`schedule_${currentUser.id}`);
    if (savedData) {
        try {
            const scheduleData = JSON.parse(savedData);
            const rows = document.querySelectorAll('#schedule-table tbody tr');
            
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('.data-cell');
                cells.forEach((cell, cellIndex) => {
                    if (scheduleData[rowIndex] && scheduleData[rowIndex][cellIndex]) {
                        cell.textContent = scheduleData[rowIndex][cellIndex];
                    } else {
                        cell.textContent = '';
                    }
                });
            });
        } catch (e) {
            console.error('Error loading schedule:', e);
        }
    }
}

// 初始化倒计时
function initializeCountdown() {
    updateDateCount();
    const dateSelector = document.getElementById('countdown-date');
    const modifyButton = document.getElementById('modify-countdown');
    
    dateSelector.style.display = 'none';
    dateSelector.min = new Date().toISOString().split('T')[0];
    
    setInterval(updateDateCount, 600);
}

// 显示日期选择器
function showDateSelector() {
    const dateSelector = document.getElementById('countdown-date');
    const modifyButton = document.getElementById('modify-countdown');
    
    modifyButton.style.display = 'none';
    dateSelector.style.display = 'block';
    dateSelector.focus();
}

// 更新倒计时
function updateCountdown() {
    const dateSelector = document.getElementById('countdown-date');
    const modifyButton = document.getElementById('modify-countdown');
    const selectedDate = dateSelector.value;
    
    if (selectedDate) {
        const eventName = prompt('事件名称:', '目标日期');
        if (eventName !== null) {
            const today = new Date().toISOString().split('T')[0];
            
            localStorage.setItem(`countdown_set_${currentUser.id}`, today);
            localStorage.setItem(`countdown_target_${currentUser.id}`, selectedDate);
            localStorage.setItem(`countdown_event_${currentUser.id}`, eventName);
            
            updateDateCount();
        }
    }
    
    dateSelector.style.display = 'none';
    modifyButton.style.display = 'block';
}

// 加载倒计时设置
function loadCountdownSettings() {
    // 可以在这里从服务器加载用户的倒计时设置
}

// 更新日期计数
function updateDateCount() {
    const countdownProgress = document.getElementById('countdown-progress');
    const countdownText = document.getElementById('countdown-text');
    
    if (!currentUser) {
        countdownProgress.style.width = '0%';
        countdownText.textContent = '请登录后设置倒计时';
        return;
    }

    const setDay = localStorage.getItem(`countdown_set_${currentUser.id}`);
    const targetDay = localStorage.getItem(`countdown_target_${currentUser.id}`);
    const eventName = localStorage.getItem(`countdown_event_${currentUser.id}`);
    
    if (!setDay || !targetDay || !eventName) {
        countdownProgress.style.width = '0%';
        countdownText.textContent = '请设置倒计时';
        return;
    }
    
    const now = new Date();
    const startDate = new Date(setDay + 'T00:00:00');
    const targetDate = new Date(targetDay + 'T00:00:00');
    const today = new Date(now.toISOString().split('T')[0] + 'T00:00:00');
    
    const totalMs = targetDate - startDate;
    const remainingMs = targetDate - now;
    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    
    let percent = 100 - (remainingMs * 100 / totalMs);
    percent = Math.max(0, Math.min(100, percent));
    
    if (remainingDays <= 0) {
        percent = 100;
        countdownText.textContent = `已到达 ${eventName}！`;
    } else {
        countdownText.textContent = `距离 ${eventName} (${targetDay}) 还剩 ${remainingDays} 天，已完成 ${percent.toFixed(2)}%`;
    }
    
    countdownProgress.style.width = `${percent}%`;
}

// 显示版本信息
function showVersion() {
    document.getElementById('version-info').innerHTML = `Version: ${VERSION} <br> Last modified: ${MODIFY}`;
}

// 更新时间
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString();
    document.getElementById('realtime').innerHTML = `${timeStr}<br>${dateStr}`;
}

// 更新网络状态
function updateNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    const statusText = document.getElementById('status-text');
    
    if (navigator.onLine) {
        networkStatus.className = 'online';
        statusText.textContent = '已连接网络';
        networkStatus.querySelector('.status-icon').textContent = '✓';
    } else {
        networkStatus.className = 'offline';
        statusText.textContent = '网络已断开';
        networkStatus.querySelector('.status-icon').textContent = '✗';
    }
}