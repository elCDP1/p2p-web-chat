// --- Datos locales ---
let currentUser = null;
let users = {}; // username -> password
let userGroups = {}; // groupName -> [members]
let invites = []; // {group, from, members}
let peers = {}; // username -> {pc, channel}
let groupChannels = {}; // groupName -> {username -> channel}

// --- Funciones generales ---
function log(msg){ console.log(msg); }
function broadcast(obj){
  Object.values(peers).forEach(p=>{
    if(p.channel && p.channel.readyState==="open") p.channel.send(JSON.stringify(obj));
  });
}
function updateUI(){ updateUsers(); updateGroups(); updateInvites(); updateGroupSelect(); }

// --- UI actualización ---
function updateUsers(){
  const div = document.getElementById('users'); div.innerHTML="";
  Object.keys(users).forEach(u=>div.innerHTML+=`<div>${u}</div>`);
}
function updateGroups(){
  const div=document.getElementById('groups'); div.innerHTML="";
  for(let g in userGroups) div.innerHTML+=`<div>${g} (miembros: ${userGroups[g].join(", ")})</div>`;
}
function updateInvites(){
  const div = document.getElementById('invites'); div.innerHTML="";
  invites.forEach((inv,i)=>{
    const box=document.createElement('div'); box.className="inviteBox";
    box.innerHTML=`<span>Invitación de <b>${inv.from}</b> al grupo <b>${inv.group}</b></span>`;
    const accept=document.createElement('button'); accept.innerText="Aceptar";
    accept.onclick=()=>{ acceptInvite(inv); invites.splice(i,1); updateUI(); };
    const reject=document.createElement('button'); reject.innerText="Rechazar";
    reject.onclick=()=>{ invites.splice(i,1); updateUI(); };
    box.appendChild(accept); box.appendChild(reject); div.appendChild(box);
  });
}
function updateGroupSelect(){
  const sel=document.getElementById('groupSelect'); sel.innerHTML="";
  for(let g in userGroups) sel.innerHTML+=`<option value="${g}">${g}</option>`;
}

// --- Login / Registro ---
document.getElementById('showLogin').onclick=()=>{ document.getElementById('loginForm').style.display='block'; document.getElementById('registerForm').style.display='none'; };
document.getElementById('showRegister').onclick=()=>{ document.getElementById('registerForm').style.display='block'; document.getElementById('loginForm').style.display='none'; };

document.getElementById('registerBtn').onclick=()=>{
  const u=document.getElementById('regUser').value.trim(); const p=document.getElementById('regPass').value.trim();
  if(!u||!p)return alert("Usuario y contraseña requeridos");
  if(users[u])return alert("Usuario ya existe");
  users[u]=p; broadcast({type:"newUser", username:u, password:p});
  currentUser=u; enterMain();
};
document.getElementById('loginBtn').onclick=()=>{
  const u=document.getElementById('loginUser').value.trim(); const p=document.getElementById('loginPass').value.trim();
  if(!u||!p)return alert("Usuario y contraseña requeridos");
  if(!users[u])return alert("Usuario no existe");
  if(users[u]!==p)return alert("Contraseña incorrecta");
  currentUser=u; enterMain();
};

function enterMain(){ document.getElementById('currentUser').innerText=currentUser; document.getElementById('loginDiv').style.display='none'; document.getElementById('mainDiv').style.display='block'; updateUI(); }

// --- Grupo e invitaciones ---
document.getElementById('createGroupBtn').onclick=()=>{
  const gName=document.getElementById('newGroupName').value.trim();
  const inviteStr=document.getElementById('inviteUsers').value.trim();
  if(!gName||!inviteStr)return alert("Nombre y usuarios requeridos");
  const invitedUsers=inviteStr.split(",").map(s=>s.trim()).filter(s=>s && s!==currentUser);
  userGroups[gName]=[currentUser];
  invitedUsers.forEach(u=>{
    if(peers[u] && peers[u].channel && peers[u].channel.readyState==="open")
      peers[u].channel.send(JSON.stringify({type:"invite", group:gName, from:currentUser, members:[currentUser,...invitedUsers]}));
  });
  updateUI();
};

function acceptInvite(inv){
  if(!userGroups[inv.group]) userGroups[inv.group]=[currentUser];
  else if(!userGroups[inv.group].includes(currentUser)) userGroups[inv.group].push(currentUser);
  inv.members.forEach(m=>{
    if(peers[m] && peers[m].channel && peers[m].channel.readyState==="open")
      peers[m].channel.send(JSON.stringify({type:"acceptInvite", group:inv.group, user:currentUser}));
  });
}

// --- Chat ---
document.getElementById('send').onclick=()=>{
  const msg=document.getElementById('msg').value.trim(); const g=document.getElementById('groupSelect').value;
  if(!msg||!g)return;
  document.getElementById('chat').innerHTML+=`<p><${currentUser}@${g}> ${msg}</p>`;
  if(groupChannels[g]){
    Object.values(groupChannels[g]).forEach(ch=>{ if(ch.readyState==="open") ch.send(JSON.stringify({type:"message", group:g, from:currentUser, msg})); });
  }
  document.getElementById('msg').value="";
};
document.getElementById('msg').addEventListener('keyup',e=>{ if(e.key==="Enter") document.getElementById('send').click(); });

// --- P2P WebRTC ---
function createPeer(username){
  if(peers[username]) return;
  const pc=new RTCPeerConnection();
  const channel=pc.createDataChannel("chat");
  setupChannel(channel, username);
  peers[username]={pc, channel};
  pc.onicecandidate=e=>{ if(e.candidate) console.log("ICE", e.candidate); };
}

function setupChannel(chan, username){
  chan.onopen=()=>log("Canal abierto con "+username);
  chan.onmessage=e=>{
    const data=JSON.parse(e.data);
    switch(data.type){
      case "newUser": users[data.username]=data.password; updateUsers(); break;
      case "invite": invites.push({group:data.group, from:data.from, members:data.members}); updateInvites(); break;
      case "acceptInvite": if(!userGroups[data.group]) userGroups[data.group]=[]; if(!userGroups[data.group].includes(data.user)) userGroups[data.group].push(data.user); updateGroups(); break;
      case "message": document.getElementById('chat').innerHTML+=`<p><${data.from}@${data.group}> ${data.msg}</p>`; break;
    }
  };
}

// --- Señalización manual ---
let pcGlobal;
document.getElementById('createOffer').onclick=async ()=>{
  pcGlobal=new RTCPeerConnection();
  const channel=pcGlobal.createDataChannel("chat");
  channel.onopen=()=>console.log("Canal global abierto");
  channel.onmessage=e=>console.log("Msg global:", e.data);
  pcGlobal.onicecandidate=e=>{ if(e.candidate) console.log("ICE", e.candidate); };
  const offer=await pcGlobal.createOffer();
  await pcGlobal.setLocalDescription(offer);
  document.getElementById('localOffer').value=JSON.stringify(offer);
};
document.getElementById('acceptOffer').onclick=async ()=>{
  const remote=JSON.parse(document.getElementById('remoteOffer').value);
  pcGlobal=new RTCPeerConnection();
  pcGlobal.ondatachannel=e=>{ e.channel.onmessage=ev=>console.log("Msg global:", ev.data); };
  await pcGlobal.setRemoteDescription(remote);
  const answer=await pcGlobal.createAnswer();
  await pcGlobal.setLocalDescription(answer);
  document.getElementById('localOffer').value=JSON.stringify(answer);
};
