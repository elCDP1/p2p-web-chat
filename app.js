/// ===== GLOBAL STATE =====
let users = [];
let currentUser = "";
let groups = []; 
let activeMD = null;

// ===== SCREEN ELEMENTS =====
const startScreen    = document.getElementById("start-screen");
const registerScreen = document.getElementById("register-screen");
const loginScreen    = document.getElementById("login-screen");
const chatScreen     = document.getElementById("chat-screen");

function showScreen(screen){
    startScreen.classList.add("hidden");
    registerScreen.classList.add("hidden");
    loginScreen.classList.add("hidden");
    chatScreen.classList.add("hidden");
    screen.classList.remove("hidden");
}

// ===== NAVIGATION =====
document.getElementById("btnShowRegister").addEventListener("click", ()=>{clearRegisterFeedback(); showScreen(registerScreen);});
document.getElementById("btnShowLogin").addEventListener("click", ()=>{clearLoginFeedback(); showScreen(loginScreen);});
document.getElementById("btnBackFromRegister").addEventListener("click", ()=>{clearRegisterFeedback(); showScreen(startScreen);});
document.getElementById("btnBackFromLogin").addEventListener("click", ()=>{clearLoginFeedback(); showScreen(startScreen);});
document.getElementById("btnLogout").addEventListener("click", ()=>{
    currentUser = "";
    activeMD = null;
    document.getElementById("send-box").classList.add("hidden");
    showScreen(startScreen);
});

// ===== REGISTER =====
const regFeedback = document.getElementById("reg-feedback");
function clearRegisterFeedback(){regFeedback.textContent=""; regFeedback.className="feedback";}
document.getElementById("btnRegister").addEventListener("click", ()=>{
    clearRegisterFeedback();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    if(!username||!password){regFeedback.textContent="Please fill out all fields."; regFeedback.classList.add("error"); return;}
    if(users.some(u=>u.username===username)){regFeedback.textContent="Username already exists."; regFeedback.classList.add("error"); return;}
    users.push({username,password});
    regFeedback.textContent="Successfully registered! Log in with your account.";
    regFeedback.classList.add("success");
    document.getElementById("reg-username").value="";
    document.getElementById("reg-password").value="";
});

// ===== LOGIN =====
const loginFeedback = document.getElementById("login-feedback");
function clearLoginFeedback(){loginFeedback.textContent=""; loginFeedback.className="feedback";}
document.getElementById("btnLogin").addEventListener("click", ()=>{
    clearLoginFeedback();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if(!username||!password){loginFeedback.textContent="Please fill out all fields."; loginFeedback.classList.add("error"); return;}
    const user = users.find(u=>u.username===username);
    if(!user){loginFeedback.textContent="This user does not exist."; loginFeedback.classList.add("error"); return;}
    if(user.password!==password){loginFeedback.textContent="Incorrect password."; loginFeedback.classList.add("error"); return;}
    currentUser=username;
    document.getElementById("current-user").textContent=username;
    document.getElementById("login-username").value="";
    document.getElementById("login-password").value="";
    renderMDLists();
    showScreen(chatScreen);
});

// ===== MD CREATION =====
const btnStartMD = document.getElementById("btnStartMD");
const mdSection = document.getElementById("md-request");
const btnSendMD = document.getElementById("btnSendMD");
const mdInput = document.getElementById("md-input");
const mdFeedback = document.getElementById("md-feedback");

btnStartMD.addEventListener("click", ()=>{
    mdSection.classList.toggle("hidden");
    mdInput.value="";
    mdFeedback.textContent="";
    mdFeedback.className="feedback";
});

document.getElementById("btnSendMD").addEventListener("click", ()=>{
    mdFeedback.textContent=""; mdFeedback.className="feedback";
    let input = mdInput.value.trim();
    if(!input){mdFeedback.textContent="Please enter at least 1 username."; mdFeedback.classList.add("error"); return;}
    let invitedUsers = input.split(",").map(u=>u.trim()).filter(u=>u && u!==currentUser);
    if(invitedUsers.length<1 || invitedUsers.length>14){mdFeedback.textContent="Group must be 2-15 people (including you)."; mdFeedback.classList.add("error"); return;}
    let invalidUsers = invitedUsers.filter(u=>!users.some(x=>x.username===u));
    if(invalidUsers.length>0){mdFeedback.textContent="These usernames do not exist: "+invalidUsers.join(", "); mdFeedback.classList.add("error"); return;}
    const groupId="group-"+(groups.length+1);
    groups.push({groupId, members:[currentUser], invited:invitedUsers, creator:currentUser, messages:[]});
    mdFeedback.textContent="Group created! Waiting for invited users to accept.";
    mdFeedback.classList.add("success");
    mdInput.value="";
    renderMDLists();
});

// ===== MD LISTS =====
const mdActiveList=document.getElementById("md-active-list");
const mdRequestsList=document.getElementById("md-requests-list");
function renderMDLists(){
    mdActiveList.innerHTML=""; mdRequestsList.innerHTML="";
    // Active MDs
    groups.forEach(group=>{
        if(group.members.includes(currentUser)){
            const li=document.createElement("li");
            li.textContent=group.groupId;
            li.addEventListener("click", ()=>{
                activeMD=group;
                document.getElementById("send-box").classList.remove("hidden");
                renderMessages();
            });
            mdActiveList.appendChild(li);
        }
    });
    // Requests
    groups.forEach(group=>{
        if(group.invited && group.invited.includes(currentUser)){
            const li=document.createElement("li");
            li.textContent=group.groupId;
            const acceptBtn=document.createElement("button");
            acceptBtn.className="md-btn accept"; acceptBtn.textContent="Accept";
            acceptBtn.addEventListener("click", ()=>{
                group.members.push(currentUser);
                group.invited=group.invited.filter(u=>u!==currentUser);
                renderMDLists();
            });
            const rejectBtn=document.createElement("button");
            rejectBtn.className="md-btn reject"; rejectBtn.textContent="Reject";
            rejectBtn.addEventListener("click", ()=>{
                group.invited=group.invited.filter(u=>u!==currentUser);
                renderMDLists();
            });
            li.appendChild(acceptBtn); li.appendChild(rejectBtn);
            mdRequestsList.appendChild(li);
        }
    });
}

// ===== CHAT =====
const messages=document.getElementById("messages");
const msgInput=document.getElementById("msg-input");
const btnSend=document.getElementById("btnSend");

function renderMessages(){
    messages.innerHTML="";
    if(!activeMD) return;
    activeMD.messages.forEach(m=>{
        const bubble=document.createElement("div");
        bubble.className="message "+(m.username===currentUser?"local":"remote");
        bubble.innerHTML=`<strong>${m.username}</strong><br>${m.text}`;
        messages.appendChild(bubble);
    });
    messages.scrollTop=messages.scrollHeight;
}

btnSend.addEventListener("click", ()=>{
    if(!activeMD) return;
    const text=msgInput.value.trim();
    if(!text) return;
    activeMD.messages.push({username:currentUser,text});
    msgInput.value="";
    renderMessages();
});

msgInput.addEventListener("keydown",e=>{if(e.key==="Enter") btnSend.click();});

