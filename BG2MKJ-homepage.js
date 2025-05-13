


function updateNetworkStatus() {
    const networkStatus = document.getElementById('networkStatus');
    const statusText = document.getElementById('statusText');
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

function updatetime(){
    const now = new Date();
    const timestr = now.toLocaleTimeString();
    const datestr = now.toLocaleDateString();
    document.getElementById("realtime").innerHTML = `${timestr}<br>${datestr}`;
}

function update_date_count(){
    const count_down_front = document.getElementById("count_down_front");
    const date_count_set_day = localStorage.getItem("date_count_set_day");
    const date_count_tar_day = localStorage.getItem("date_count_tar_day");
    const date_count_event = localStorage.getItem("date_count_event");
    const count_down_text = document.getElementById("count_down_text");
    const today = new Date();
    let date_count_today = today.toISOString().split('T')[0];

    function getDayDiff(dateStr1, dateStr2) {
        // 将日期字符串转换为 Date 对象
        const date1 = new Date(dateStr1);
        const date2 = new Date(dateStr2);
        
        // 计算时间差（毫秒）
        const timeDiff = (date2 - date1);
        
        // 将毫秒转换为天数
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    }

    
    const last_days = getDayDiff(date_count_today,date_count_tar_day);
    const whole_days = getDayDiff(date_count_set_day,date_count_tar_day);
    let count_percent = 100 - last_days *100 / whole_days;
    let count_show = `距离  ${date_count_event}  ${date_count_tar_day}  还剩 ${last_days} 天   已完成${count_percent.toFixed(1)}%`;
    
    if(last_days<=0)
    {
        count_percent=100;
        count_show = `到达 ${date_count_event} !`;
    }

    
    count_down_text.textContent = count_show;
    count_down_front.style.width = `${count_percent}%`;
    

}


function init_count_down(){
    update_date_count();
    const date_selector = document.getElementById("date_selector");
    const date_modify_button = document.getElementById("modify_count_down");
    const date_count_set_day = localStorage.getItem("date_count_set_day");
    let date_count_event = "目标日期";
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    date_selector.style.display = "none";
    //alert(formattedDate);
    date_selector.min = formattedDate;

    date_selector.addEventListener('change', function(e) {
        console.log('选择的日期:', this.value); // 格式: YYYY-MM-DD
        date_count_event = prompt("事件:","目标日期");
        console.log("选择的事件:",date_count_event);
        if(date_count_event !== null)
        {
            
            localStorage.setItem("date_count_set_day",formattedDate);
            localStorage.setItem("date_count_tar_day",this.value);
            localStorage.setItem("date_count_event",date_count_event);
            update_date_count();
        }
        this.style.display = "none";
        date_modify_button.style.display = "block";
        
    });

    date_modify_button.addEventListener("click",function(){
        this.style.display = "none";
        date_selector.style.display = "block";
    });

}

function init_custom_link(){
    
    const custom_link_to = document.getElementById("custom_link_to");
    let custom_link_text = localStorage.getItem("custom_link");
    const custom_link = document.getElementById("custom_link");
    const custom_link_confirm = document.getElementById("custom_link_confirm");
    if(custom_link_text){
        custom_link_to.href = custom_link_text;
        custom_link.value = custom_link_text;
        
    }
    custom_link_confirm.addEventListener("click",function(){
        
        custom_link_text = custom_link.value;
        custom_link_to.href = custom_link_text;
        localStorage.setItem("custom_link",custom_link_text);
        alert(`Add custom: ${custom_link_text}`);
    });
    custom_link.addEventListener("click",function(){
        this.select();
    });

}

document.addEventListener("DOMContentLoaded",function(){

    const usertype = "admin";
    let isinediting =0;
    const password = "liu";
    const ifload =  1 ;
    



    const table = document.getElementById("coursetable");
    const editbutton = document.getElementById("editbutton");
    const commitbutton = document.getElementById("commitbutton");
    const cancelbutton = document.getElementById("cancelbutton");
    const passwordtext = document.getElementById("passwordtext");
    const storagedata = localStorage.getItem("coursetable");

    init_custom_link();

    init_count_down();

    updatetime();
    setInterval(updatetime,1000);

    updateNetworkStatus()
    setInterval(updateNetworkStatus, 5000);
    if(ifload)
    {
        if(storagedata)
            {
                const rows = JSON.parse(storagedata);
                const tbody = table.querySelector("tbody");
                tbody.innerHTML="";
                rows.forEach(row => {
                    const tr = document.createElement("tr");
                    
                    row.forEach((data,index) => {
                        const td =document.createElement("td");
                        td.textContent=data;
                        console.log(data,"上午" );
                        if(index==0)
                        {

                            td.className = "time";

                        }
                        else
                        {
                            td.className = "data";
                        }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            }
            else
            {
                console.log("load error!");
            }
    }
    


    editbutton.addEventListener("click",function(){
        if(isinediting===1){
            return;
        }
        if(usertype === "admin"){
            isinediting = 1 ;
            const cells = table.querySelectorAll('td.data');
            cells.forEach(cell => {
                const input = document.createElement("input");
                input.type="text";
                
                input.className="editable-cell";
                input.value=cell.textContent;
                
                cell.textContent="";
                cell.appendChild(input);
            });
        }
    });

    commitbutton.addEventListener("click",function(){
        if(isinediting==0)
            {
                return;
            }
        // if(passwordtext.value != password)
        // {
        //     console.log("password wrong!");
        //     alert("password wrong!");
        //     return ;
        // }
        
        const cells = table.querySelectorAll(".editable-cell");
        cells.forEach(cell => {
            const parent = cell.parentNode;
            parent.textContent=cell.value;
        });
        const rows = [];
        const tbody = table.querySelector("tbody");
        tbody.querySelectorAll("tr").forEach(tr => {
            const row = [];
            tr.querySelectorAll("td").forEach(td => {
                row.push(td.textContent);
            });
            rows.push(row);
        });
        localStorage.setItem("coursetable",JSON.stringify(rows));
        //alert("save!");
        isinediting=0;
    });

    cancelbutton.addEventListener("click",function(){
        if(isinediting===1)
        {
            isinediting=0;
            location.reload();
        }
        
    });

   

});

