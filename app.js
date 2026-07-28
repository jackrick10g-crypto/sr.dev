/* ==========================================================
   SR.DEV — app.js
   NOTE ON SECURITY: this is a fully client-side demo. All data
   (users, orders, suggestions, resources) lives in the visitor's
   own browser via localStorage — there is no real server or
   database. That means:
     - accounts do NOT sync across devices/browsers
     - the owner password check below is NOT secure (anyone can
       read it by viewing this file's source)
   For a real production site you'd swap the STORE.* functions
   for calls to a real backend (Node/Express, Firebase, Supabase,
   etc). Everything is structured so that swap is easy — every
   read/write goes through the STORE object below.
   ========================================================== */

(function(){
  "use strict";

  /* ---------- config: owner account ---------- */
  const OWNER = {
    email: "jackrick10@gmail.com",
    password: "sovele@3", // demo-only plaintext check, see note above
    username: "SR.DEV Owner"
  };

  /* ---------- tiny storage helpers ---------- */
  const LS_KEY = "srdev_db_v1";
  function loadDB(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ console.warn("DB load failed", e); }
    return null;
  }
  function saveDB(){
    localStorage.setItem(LS_KEY, JSON.stringify(DB));
  }

  function seedResources(){
    return [
      { id: uid(), category:"plugin", title:"CoreEssentials", description:"Lightweight essentials plugin: homes, warps, kits and tpa requests for survival servers.", version:"2.3.0", link:"#", downloads:412, date:"2026-05-02" },
      { id: uid(), category:"plugin", title:"ArenaFight", description:"Configurable 1v1/FFA arena plugin with kits, spectating and a leaderboard.", version:"1.4.1", link:"#", downloads:198, date:"2026-06-14" },
      { id: uid(), category:"map", title:"Skyline Parkour", description:"20-stage parkour map with checkpoints and a built-in timer scoreboard.", version:"1.0", link:"#", downloads:301, date:"2026-04-20" },
      { id: uid(), category:"map", title:"Hollow Spawn Hub", description:"A compact, lag-friendly spawn hub build with NPC-ready portal frames.", version:"1.2", link:"#", downloads:255, date:"2026-03-11" },
      { id: uid(), category:"config", title:"Paper Performance Pack", description:"Tuned paper.yml / spigot.yml for smoother TPS on survival servers.", version:"1.21", link:"#", downloads:520, date:"2026-06-01" },
      { id: uid(), category:"skript", title:"Custom Join Messages", description:"Skript for animated, per-rank join/leave messages with sound cues.", version:"1.0", link:"#", downloads:167, date:"2026-05-28" },
      { id: uid(), category:"other", title:"Server Icon Pack", description:"A set of 12 pixel-art server icons (64x64) free to use on any server.", version:"1.0", link:"#", downloads:89, date:"2026-02-19" }
    ];
  }

  let DB = loadDB() || {
    users: [ { id: uid(), username: OWNER.username, email: OWNER.email, isOwner:true } ],
    resources: seedResources(),
    orders: [],
    suggestions: [
      { id: uid(), title:"Auto-restart scheduler plugin", details:"A free plugin to schedule restarts with warning countdowns in chat.", author:"Guest", votes:14, votedBy:[], status:"planned", date:"2026-06-10" },
      { id: uid(), title:"Skript snippet pack for holograms", details:"", author:"Guest", votes:7, votedBy:[], status:"open", date:"2026-06-20" }
    ],
    session: null // {email, username, isOwner}
  };
  saveDB();

  function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }

  /* ---------- toast ---------- */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg, isError){
    toastEl.textContent = msg;
    toastEl.classList.toggle("error", !!isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.classList.remove("show"), 2600);
  }

  /* ---------- routing ---------- */
  const views = Array.from(document.querySelectorAll("[data-view]"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));

  function currentRoute(){
    return (location.hash || "#home").replace("#","");
  }

  function render(){
    const route = currentRoute();
    const guardedRoutes = { orders:false, suggestions:false }; // login not strictly required to view

    views.forEach(v => {
      const name = v.id.replace("view-","");
      v.hidden = name !== route;
    });

    // owner-only route guard
    if(route === "owner" && !(DB.session && DB.session.isOwner)){
      location.hash = "#login";
      toast("Owner access only — log in as the owner.", true);
      return;
    }

    navLinks.forEach(a=>{
      a.classList.toggle("active", a.dataset.nav === route);
    });

    document.getElementById("navLinks").closest(".nav").classList.remove("open");

    if(route === "resources") renderResources();
    if(route === "home") renderHome();
    if(route === "orders") renderOrders();
    if(route === "suggestions") renderSuggestions();
    if(route === "owner") renderOwner();

    window.scrollTo({top:0, behavior:"instant" in window ? "instant" : "auto"});
  }
  window.addEventListener("hashchange", render);

  /* ---------- nav burger ---------- */
  document.getElementById("navBurger").addEventListener("click", ()=>{
    document.querySelector(".nav").classList.toggle("open");
  });

  /* ---------- auth state / UI ---------- */
  function refreshAuthUI(){
    const loggedIn = !!DB.session;
    document.getElementById("loginBtn").hidden = loggedIn;
    document.getElementById("registerBtn").hidden = loggedIn;
    document.getElementById("userChip").hidden = !loggedIn;
    document.getElementById("ownerNavLink").hidden = !(loggedIn && DB.session.isOwner);
    if(loggedIn){
      document.getElementById("userName").textContent = DB.session.username;
      document.getElementById("userAvatar").textContent = DB.session.username.slice(0,1).toUpperCase();
    }
    document.getElementById("orderLoginHint").hidden = loggedIn;
    document.getElementById("suggestionLoginHint").hidden = loggedIn;
  }

  document.getElementById("logoutBtn").addEventListener("click", ()=>{
    DB.session = null; saveDB(); refreshAuthUI();
    toast("Logged out.");
    location.hash = "#home";
  });

  /* ---------- register ---------- */
  document.getElementById("registerForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const username = f.get("username").trim();
    const email = f.get("email").trim().toLowerCase();
    const password = f.get("password");
    const errEl = document.getElementById("registerError");
    errEl.hidden = true;

    if(email === OWNER.email){
      errEl.textContent = "This email is reserved for the site owner.";
      errEl.hidden = false; return;
    }
    if(DB.users.some(u=>u.email === email)){
      errEl.textContent = "An account with that email already exists.";
      errEl.hidden = false; return;
    }
    DB.users.push({ id: uid(), username, email, passwordHash: btoa(password), isOwner:false });
    saveDB();
    DB.session = { email, username, isOwner:false };
    saveDB();
    refreshAuthUI();
    toast("Account created — welcome, " + username + "!");
    e.target.reset();
    location.hash = "#home";
  });

  /* ---------- login ---------- */
  document.getElementById("loginForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const email = f.get("email").trim().toLowerCase();
    const password = f.get("password");
    const errEl = document.getElementById("loginError");
    errEl.hidden = true;

    if(email === OWNER.email && password === OWNER.password){
      DB.session = { email, username: OWNER.username, isOwner:true };
      saveDB(); refreshAuthUI();
      toast("Welcome back, owner.");
      e.target.reset();
      location.hash = "#owner";
      return;
    }

    const user = DB.users.find(u=>u.email === email && u.passwordHash === btoa(password));
    if(!user){
      errEl.textContent = "Incorrect email or password.";
      errEl.hidden = false; return;
    }
    DB.session = { email:user.email, username:user.username, isOwner:false };
    saveDB(); refreshAuthUI();
    toast("Welcome back, " + user.username + "!");
    e.target.reset();
    location.hash = "#home";
  });

  /* ---------- resources ---------- */
  let activeFilter = "all";
  function renderResources(){
    const grid = document.getElementById("resourceGrid");
    const empty = document.getElementById("resourceEmpty");
    const q = document.getElementById("resourceSearch").value.trim().toLowerCase();
    document.getElementById("addResourceBtn").hidden = !(DB.session && DB.session.isOwner);

    let list = DB.resources.filter(r=>{
      const matchesFilter = activeFilter === "all" || r.category === activeFilter;
      const matchesQuery = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    }).sort((a,b)=> (b.date||"").localeCompare(a.date||""));

    grid.innerHTML = list.map(resourceCardHTML).join("");
    empty.hidden = list.length !== 0;
  }
  function resourceCardHTML(r){
    return `
      <article class="res-card cat-${r.category}">
        <div class="res-top">
          <h3>${escapeHTML(r.title)}</h3>
          <span class="res-tag">${r.category}</span>
        </div>
        <p>${escapeHTML(r.description)}</p>
        <div class="res-meta">
          <span class="res-free">FREE</span>
          <span>v${escapeHTML(r.version||"1.0")} · ${r.downloads||0} downloads</span>
        </div>
        <div class="res-actions">
          <a class="btn btn-primary btn-sm" href="${r.link||'#'}" target="_blank" rel="noopener">Download</a>
        </div>
      </article>`;
  }
  function renderHome(){
    document.getElementById("statResources").textContent = DB.resources.length;
    document.getElementById("statOrders").textContent = DB.orders.filter(o=>o.status==="delivered").length;
    document.getElementById("statSuggestions").textContent = DB.suggestions.length;
    const preview = [...DB.resources].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,3);
    document.getElementById("homeResourcePreview").innerHTML = preview.map(resourceCardHTML).join("");
  }
  document.getElementById("filterChips").addEventListener("click",(e)=>{
    const chip = e.target.closest(".chip");
    if(!chip) return;
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderResources();
  });
  document.getElementById("resourceSearch").addEventListener("input", renderResources);
  document.getElementById("addResourceBtn").addEventListener("click", ()=> location.hash = "#owner");

  /* ---------- orders ---------- */
  document.getElementById("orderForm").addEventListener("submit",(e)=>{
    e.preventDefault();
    if(!DB.session){
      toast("Please log in before submitting an order.", true);
      location.hash = "#login";
      return;
    }
    const f = new FormData(e.target);
    const order = {
      id: uid(),
      title: f.get("title").trim(),
      platform: f.get("platform").trim(),
      description: f.get("description").trim(),
      budget: f.get("budget"),
      deadline: f.get("deadline") || "",
      contact: f.get("contact").trim(),
      status: "pending",
      user: DB.session.username,
      email: DB.session.email,
      date: new Date().toISOString().slice(0,10)
    };
    DB.orders.push(order);
    saveDB();
    e.target.reset();
    toast("Order submitted! The owner will reach out via your contact info.");
    renderOrders();
  });
  function renderOrders(){
    const box = document.getElementById("myOrders");
    if(!DB.session){
      box.innerHTML = `<p class="muted">Log in to see your order history.</p>`;
      return;
    }
    const mine = DB.orders.filter(o=>o.email === DB.session.email);
    if(mine.length === 0){
      box.innerHTML = `<p class="muted">No orders yet — submit the form to commission your first plugin.</p>`;
      return;
    }
    box.innerHTML = mine.map(o=>`
      <div class="dash-item" style="padding:.8rem 1rem;">
        <div class="dash-item-main">
          <h4>${escapeHTML(o.title)}</h4>
          <p>Budget $${escapeHTML(o.budget)} · <span class="status-pill status-${statusClass(o.status)}">${o.status}</span></p>
        </div>
      </div>`).join("");
  }
  function statusClass(s){
    if(s==="delivered") return "done";
    if(s==="in-progress"||s==="accepted") return "planned";
    return "open";
  }

  /* ---------- suggestions ---------- */
  document.getElementById("suggestionForm").addEventListener("submit",(e)=>{
    e.preventDefault();
    if(!DB.session){
      toast("Please log in to post a suggestion.", true);
      location.hash = "#login";
      return;
    }
    const f = new FormData(e.target);
    const title = f.get("title").trim();
    if(!title) return;
    DB.suggestions.unshift({
      id: uid(), title, details: f.get("details").trim(),
      author: DB.session.username, votes:0, votedBy:[], status:"open",
      date: new Date().toISOString().slice(0,10)
    });
    saveDB();
    e.target.reset();
    toast("Suggestion posted — thanks!");
    renderSuggestions();
  });
  function renderSuggestions(){
    const list = document.getElementById("suggestionList");
    const sorted = [...DB.suggestions].sort((a,b)=> b.votes - a.votes);
    list.innerHTML = sorted.map(s=>{
      const voterKey = DB.session ? DB.session.email : null;
      const voted = voterKey && s.votedBy.includes(voterKey);
      return `
      <div class="sugg-card">
        <button class="vote-btn ${voted?'voted':''}" data-vote="${s.id}">▲<span>${s.votes}</span></button>
        <div class="sugg-body">
          <h4>${escapeHTML(s.title)}</h4>
          ${s.details ? `<p>${escapeHTML(s.details)}</p>` : ""}
          <div class="sugg-meta">
            <span>by ${escapeHTML(s.author)}</span>
            <span class="status-pill status-${s.status==='planned'?'planned':s.status==='done'?'done':'open'}">${s.status}</span>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  document.getElementById("suggestionList").addEventListener("click",(e)=>{
    const btn = e.target.closest(".vote-btn");
    if(!btn) return;
    if(!DB.session){ toast("Log in to vote.", true); location.hash="#login"; return; }
    const s = DB.suggestions.find(x=>x.id===btn.dataset.vote);
    if(!s) return;
    const key = DB.session.email;
    const idx = s.votedBy.indexOf(key);
    if(idx>-1){ s.votedBy.splice(idx,1); s.votes--; }
    else { s.votedBy.push(key); s.votes++; }
    saveDB();
    renderSuggestions();
  });

  /* ---------- owner dashboard ---------- */
  function renderOwner(){
    renderDashResources();
    renderDashOrders();
    renderDashSuggestions();
    renderDashUsers();
  }
  function renderDashResources(){
    document.getElementById("dashResourceList").innerHTML = DB.resources.map(r=>`
      <div class="dash-item">
        <div class="dash-item-main">
          <h4>${escapeHTML(r.title)} <span class="res-tag">${r.category}</span></h4>
          <p>${escapeHTML(r.description)}</p>
          <div class="dash-item-meta">v${escapeHTML(r.version||"1.0")} · ${r.downloads||0} downloads · added ${r.date}</div>
        </div>
        <div class="dash-actions">
          <button class="btn btn-sm btn-danger" data-del-resource="${r.id}">Delete</button>
        </div>
      </div>`).join("") || `<p class="muted">No resources yet.</p>`;
  }
  document.getElementById("resourceForm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const f = new FormData(e.target);
    DB.resources.unshift({
      id: uid(), title:f.get("title").trim(), category:f.get("category"),
      description:f.get("description").trim(), version:f.get("version").trim()||"1.0",
      link:f.get("link").trim()||"#", downloads:0, date:new Date().toISOString().slice(0,10)
    });
    saveDB();
    e.target.reset();
    toast("Resource added.");
    renderDashResources();
  });
  document.getElementById("dashResourceList").addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-del-resource]");
    if(!btn) return;
    if(!confirm("Delete this resource?")) return;
    DB.resources = DB.resources.filter(r=>r.id !== btn.dataset.delResource);
    saveDB();
    renderDashResources();
  });

  function renderDashOrders(){
    const statuses = ["pending","accepted","in-progress","delivered","declined"];
    document.getElementById("dashOrderList").innerHTML = [...DB.orders].reverse().map(o=>`
      <div class="dash-item">
        <div class="dash-item-main">
          <h4>${escapeHTML(o.title)}</h4>
          <p>${escapeHTML(o.description)}</p>
          <div class="dash-item-meta">${escapeHTML(o.user)} (${escapeHTML(o.email)}) · budget $${escapeHTML(o.budget)} · contact: ${escapeHTML(o.contact)} · platform: ${escapeHTML(o.platform)} ${o.deadline ? "· due "+o.deadline : ""}</div>
        </div>
        <div class="dash-actions">
          <select data-order-status="${o.id}">
            ${statuses.map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${s}</option>`).join("")}
          </select>
          <button class="btn btn-sm btn-danger" data-del-order="${o.id}">Delete</button>
        </div>
      </div>`).join("") || `<p class="muted">No orders yet.</p>`;
  }
  document.getElementById("dashOrderList").addEventListener("change",(e)=>{
    const sel = e.target.closest("[data-order-status]");
    if(!sel) return;
    const o = DB.orders.find(x=>x.id===sel.dataset.orderStatus);
    if(o){ o.status = sel.value; saveDB(); toast("Order status updated."); }
  });
  document.getElementById("dashOrderList").addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-del-order]");
    if(!btn) return;
    if(!confirm("Delete this order?")) return;
    DB.orders = DB.orders.filter(o=>o.id!==btn.dataset.delOrder);
    saveDB();
    renderDashOrders();
  });

  function renderDashSuggestions(){
    const statuses = ["open","planned","done"];
    document.getElementById("dashSuggestionList").innerHTML = [...DB.suggestions].map(s=>`
      <div class="dash-item">
        <div class="dash-item-main">
          <h4>${escapeHTML(s.title)}</h4>
          ${s.details?`<p>${escapeHTML(s.details)}</p>`:""}
          <div class="dash-item-meta">by ${escapeHTML(s.author)} · ${s.votes} votes</div>
        </div>
        <div class="dash-actions">
          <select data-sugg-status="${s.id}">
            ${statuses.map(st=>`<option value="${st}" ${st===s.status?"selected":""}>${st}</option>`).join("")}
          </select>
          <button class="btn btn-sm btn-danger" data-del-sugg="${s.id}">Delete</button>
        </div>
      </div>`).join("") || `<p class="muted">No suggestions yet.</p>`;
  }
  document.getElementById("dashSuggestionList").addEventListener("change",(e)=>{
    const sel = e.target.closest("[data-sugg-status]");
    if(!sel) return;
    const s = DB.suggestions.find(x=>x.id===sel.dataset.suggStatus);
    if(s){ s.status = sel.value; saveDB(); toast("Suggestion status updated."); }
  });
  document.getElementById("dashSuggestionList").addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-del-sugg]");
    if(!btn) return;
    if(!confirm("Delete this suggestion?")) return;
    DB.suggestions = DB.suggestions.filter(s=>s.id!==btn.dataset.delSugg);
    saveDB();
    renderDashSuggestions();
  });

  function renderDashUsers(){
    document.getElementById("dashUserList").innerHTML = DB.users.map(u=>`
      <div class="dash-item">
        <div class="dash-item-main">
          <h4>${escapeHTML(u.username)} ${u.isOwner?'<span class="res-tag">owner</span>':''}</h4>
          <p>${escapeHTML(u.email)}</p>
        </div>
      </div>`).join("");
  }

  /* ---------- owner dashboard tabs ---------- */
  document.getElementById("ownerTabs").addEventListener("click",(e)=>{
    const tab = e.target.closest(".tab");
    if(!tab) return;
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });

  /* ---------- background blocks ---------- */
  (function seedBgBlocks(){
    const holder = document.getElementById("bgBlocks");
    const n = 22;
    for(let i=0;i<n;i++){
      const b = document.createElement("span");
      b.className = "b";
      b.style.left = Math.random()*100 + "%";
      b.style.top = 100 + Math.random()*100 + "%";
      b.style.animationDuration = (14 + Math.random()*14) + "s";
      b.style.animationDelay = (Math.random()*10) + "s";
      const size = 8 + Math.random()*14;
      b.style.width = size+"px"; b.style.height = size+"px";
      const colors = ["#22c57a","#e8b93a","#e0453a"];
      b.style.background = colors[i % colors.length];
      holder.appendChild(b);
    }
  })();

  /* ---------- util ---------- */
  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  refreshAuthUI();
  render();
})();
