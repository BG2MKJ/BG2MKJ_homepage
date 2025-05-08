


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
                alert("load error!");
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
        if(passwordtext.value != password)
        {
            console.log("password wrong!");
            alert("password wrong!");
            return ;
        }
        
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
        alert("save!");
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

