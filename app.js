/* ====== Match Squater — app.js ====== */
let CURRENT_USER = null;   // supabase auth user
let IS_ADMIN = false;
let ALL_ADMINS = [];

const $app = () => document.getElementById("app");

function escapeHtml(s){
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function money(n){ return "$" + (Math.round((Number(n)||0)*100)/100).toLocaleString(); }
function toast(msg, ms=2600){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove("show"), ms);
}
function statusLabel(s){
  return {open:"Furan", full:"Buuxsamay", live:"Live", completed:"Dhammaystiran"}[s] || s;
}
function gameLabel(g){
  return {efootball:"eFootball", fc_mobile:"FC Mobile"}[g] || g;
}

/* ---------------- AUTH ---------------- */
async function initAuth(){
  const { data: { session } } = await sb.auth.getSession();
  await onSessionChange(session);
  sb.auth.onAuthStateChange(async (_event, session) => {
    await onSessionChange(session);
    route();
  });
}

async function onSessionChange(session){
  CURRENT_USER = session ? session.user : null;
  IS_ADMIN = false;
  const authBtn = document.getElementById("navAuthBtn");
  const adminLink = document.getElementById("adminNavLink");
  if (CURRENT_USER){
    authBtn.textContent = "Ka bax (" + (CURRENT_USER.email||"").split("@")[0] + ")";
    authBtn.onclick = doSignOut;
    try{
      const { data: adminRows } = await sb.from("admins").select("email").eq("email", (CURRENT_USER.email||"").toLowerCase());
      IS_ADMIN = !!(adminRows && adminRows.length);
    }catch(e){ IS_ADMIN = false; }
    adminLink.style.display = IS_ADMIN ? "block" : "none";
  } else {
    authBtn.textContent = "Login";
    authBtn.onclick = () => { location.hash = "#/login"; };
    adminLink.style.display = "none";
  }
}

async function doSignUp(email, password){
  const redirectTo = location.origin + location.pathname;
  const { error } = await sb.auth.signUp({
    email, password,
    options: { emailRedirectTo: redirectTo }
  });
  if (error){ toast("Khalad: " + error.message); return; }
  toast("✅ Hubi email-kaaga si aad u xaqiijiso account-ka, dabadeed soo gal.", 5000);
}
async function doSignInPassword(email, password){
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error){
    if (/confirm/i.test(error.message)) toast("Fadlan marka hore xaqiiji email-kaaga.");
    else toast("Khalad: " + error.message);
    return;
  }
  toast("✅ Ku soo dhawoow!");
  location.hash = "#/home";
}
async function doResetPassword(email){
  if (!email){ toast("Marka hore geli email-kaaga kore"); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error){ toast("Khalad: " + error.message); return; }
  toast("✅ Link dib-u-dejinta lambarka sirta ah ayaa loo diray email-kaaga.", 5000);
}
async function doSignOut(){
  await sb.auth.signOut();
  toast("Waad ka baxday");
  location.hash = "#/home";
}

/* ---------------- NAV UI ---------------- */
function setupNav(){
  const side = document.getElementById("sideNav");
  const overlay = document.getElementById("navOverlay");
  const burger = document.getElementById("hamburgerBtn");
  const openNav = () => { side.classList.add("open"); overlay.classList.add("open"); };
  const closeNav = () => { side.classList.remove("open"); overlay.classList.remove("open"); };
  burger.onclick = openNav;
  overlay.onclick = closeNav;
  document.querySelectorAll(".sidenav .nav-link[href]").forEach(a => a.addEventListener("click", closeNav));

  window.addEventListener("hashchange", () => { route(); updateBottomNav(); closeNav(); window.scrollTo(0,0); });
}
function updateBottomNav(){
  const h = location.hash || "#/home";
  document.querySelectorAll(".bn-item").forEach(el=>{
    const match = h.startsWith(el.getAttribute("href"));
    el.classList.toggle("active", match);
  });
}

/* ---------------- ROUTER ---------------- */
async function route(){
  const hash = location.hash || "#/home";
  const parts = hash.replace("#/","").split("/").filter(Boolean);
  $app().innerHTML = `<div class="spinner"></div>`;
  try{
    if (parts[0] === "home" || parts.length===0) return renderHome();
    if (parts[0] === "tournaments") return renderTournamentsList();
    if (parts[0] === "tournament" && parts[1]) return renderTournamentDetail(parts[1]);
    if (parts[0] === "live") return renderLive();
    if (parts[0] === "login") return renderLogin();
    if (parts[0] === "account") return renderAccount();
    if (parts[0] === "admin" && parts[1] === "tournament" && parts[2]) return renderAdminTournament(parts[2]);
    if (parts[0] === "admin") return renderAdmin();
    return renderHome();
  }catch(err){
    console.error(err);
    $app().innerHTML = `<div class="empty-state">Khalad ayaa dhacay.<br><span class="muted">${escapeHtml(err.message||"")}</span></div>`;
  }
  updateBottomNav();
}

/* ---------------- DATA HELPERS ---------------- */
async function fetchTournaments(statuses){
  let q = sb.from("tournaments").select("*").order("created_at",{ascending:false});
  if (statuses) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function fetchCounts(){
  const { data, error } = await sb.from("tournament_counts").select("*");
  if (error) throw error;
  const map = {};
  (data||[]).forEach(r => map[r.tournament_id] = r.registered_count);
  return map;
}
function prizeBreakdown(t, count){
  const pool = (t.entry_fee||0) * count;
  const fee = pool * (t.fee_percent||0)/100;
  const remain = pool - fee;
  return {
    pool, fee, remain,
    first: remain * (t.split_first||0)/100,
    second: remain * (t.split_second||0)/100,
    third: remain * (t.split_third||0)/100,
  };
}

/* ---------------- HOME ---------------- */
async function renderHome(){
  const [tournaments, counts] = await Promise.all([fetchTournaments(["open","live"]), fetchCounts()]);
  const list = tournaments.slice(0,8);
  $app().innerHTML = `
    <div class="auth-hero" style="padding:18px 0 6px">
      <img src="icon-192.png" alt="">
      <h2>Match Squater</h2>
      <p class="muted">Ku biir tartamada eFootball & FC Mobile, ku guuleyso lacag!</p>
    </div>
    <div class="section-title">Tartamada socda</div>
    <div id="homeList"></div>
    <a href="#/tournaments" class="btn btn-outline" style="margin-top:4px">Arag Dhammaan Tartamada →</a>
  `;
  const box = document.getElementById("homeList");
  if (!list.length){ box.innerHTML = `<div class="empty-state">Hadda ma jiro tartan socda.</div>`; return; }
  box.innerHTML = list.map(t => tournamentCard(t, counts[t.id]||0)).join("");
}

function tournamentCard(t, count){
  const pct = t.target_players ? Math.min(100, Math.round(count/t.target_players*100)) : 0;
  return `
  <a href="#/tournament/${t.id}" class="card" style="display:block">
    <div class="row">
      <h3>${escapeHtml(t.title)}</h3>
      <span class="pill ${t.status}">${statusLabel(t.status)}</span>
    </div>
    <div class="muted">${gameLabel(t.game)} · Fee: ${money(t.entry_fee)}</div>
    <div class="progress-wrap">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label"><span>${count}/${t.target_players} tartame</span><span>Harsan: ${Math.max(0,t.target_players-count)}</span></div>
    </div>
  </a>`;
}

/* ---------------- TOURNAMENTS LIST ---------------- */
let TL_FILTER = "all";
async function renderTournamentsList(){
  const statusMap = {all:null, open:["open"], live:["live"], completed:["completed"], full:["full"]};
  const [tournaments, counts] = await Promise.all([fetchTournaments(statusMap[TL_FILTER]), fetchCounts()]);
  $app().innerHTML = `
    <div class="section-title">Tartamada</div>
    <div class="tabs" id="tlTabs">
      ${["all","open","live","full","completed"].map(f=>`<div class="tab ${TL_FILTER===f?'active':''}" data-f="${f}">${f==="all"?"Dhammaan":statusLabel(f)}</div>`).join("")}
    </div>
    <div id="tlList">${tournaments.length ? tournaments.map(t=>tournamentCard(t,counts[t.id]||0)).join("") : '<div class="empty-state">Ma jiro tartan.</div>'}</div>
  `;
  document.querySelectorAll("#tlTabs .tab").forEach(el=>{
    el.onclick = () => { TL_FILTER = el.dataset.f; renderTournamentsList(); };
  });
}

/* ---------------- TOURNAMENT DETAIL ---------------- */
async function renderTournamentDetail(id){
  const { data: t, error } = await sb.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (error || !t){ $app().innerHTML = `<div class="empty-state">Tartanka lama helin.</div>`; return; }
  const { data: countRow } = await sb.from("tournament_counts").select("registered_count").eq("tournament_id", id).maybeSingle();
  const count = countRow ? countRow.registered_count : 0;
  const pct = t.target_players ? Math.min(100, Math.round(count/t.target_players*100)) : 0;
  const prize = prizeBreakdown(t, count);

  let myReg = null;
  if (CURRENT_USER){
    const { data: mr } = await sb.from("registrations").select("*").eq("tournament_id", id).eq("user_id", CURRENT_USER.id).maybeSingle();
    myReg = mr;
  }

  const { data: groups } = await sb.from("groups").select("*").eq("tournament_id", id).order("group_no");
  const { data: members } = await sb.from("group_members_public").select("*").eq("tournament_id", id);
  const { data: results } = await sb.from("results_public").select("*").eq("tournament_id", id);

  $app().innerHTML = `
    <div class="card">
      <div class="row"><h3 style="font-size:19px">${escapeHtml(t.title)}</h3><span class="pill ${t.status}">${statusLabel(t.status)}</span></div>
      <div class="muted">${gameLabel(t.game)} · Fee: ${money(t.entry_fee)} · Bar-goob: ${count}/${t.target_players}</div>
      ${t.announcement ? `<p style="margin:10px 0 0">${escapeHtml(t.announcement)}</p>` : ""}
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label"><span>${count}/${t.target_players} tartame</span><span>Harsan: ${Math.max(0,t.target_players-count)}</span></div>
      </div>
      <div class="prize-grid">
        <div class="prize-box"><div class="amt">${money(prize.first)}</div><div class="lbl">🥇 1aad (${t.split_first}%)</div></div>
        <div class="prize-box"><div class="amt">${money(prize.second)}</div><div class="lbl">🥈 2aad (${t.split_second}%)</div></div>
        <div class="prize-box"><div class="amt">${money(prize.third)}</div><div class="lbl">🥉 3aad (${t.split_third}%)</div></div>
      </div>
      <div class="muted" style="margin-top:8px;font-size:11.5px">Wadarta: ${money(prize.pool)} · Fee-ga appka (${t.fee_percent}%): ${money(prize.fee)}</div>
      <div style="margin-top:14px">
        ${registerButtonHtml(t, myReg, count)}
      </div>
    </div>

    ${(groups && groups.length) ? renderGroupsSection(groups, members||[], results||[]) : ""}
  `;
  const btn = document.getElementById("regBtn");
  if (btn) btn.onclick = () => openRegisterModal(t);
}

function registerButtonHtml(t, myReg, count){
  if (myReg){
    const paid = myReg.payment_status === "paid";
    return `<div class="row"><span class="pill ${paid?'open':'full'}">${paid?'✅ Lacagta waa la xaqiijiyay':'⏳ Sugaya xaqiijinta lacagta'}</span></div>
    <div class="muted" style="margin-top:6px">Waad ku diiwaan gashan tahay tartankan (${escapeHtml(myReg.player_tag||"")}).</div>`;
  }
  if (!CURRENT_USER){
    return `<button class="btn btn-gold" onclick="location.hash='#/login'">Soo Gal si aad u Tartantid</button>`;
  }
  if (t.status !== "open" || count >= t.target_players){
    return `<button class="btn btn-outline" disabled>Diiwaan gelintu way xidhan tahay</button>`;
  }
  return `<button class="btn btn-gold" id="regBtn">📝 Ku Biir Tartanka — ${money(t.entry_fee)}</button>`;
}

function renderGroupsSection(groups, members, results){
  return `
  <div class="section-title">Kooxaha (Cups)</div>
  ${groups.map(g=>{
    const gm = members.filter(m=>m.group_id===g.id);
    const gr = results.filter(r=>r.group_id===g.id).sort((a,b)=>a.position-b.position);
    const medal = {1:"🥇",2:"🥈",3:"🥉"};
    return `<div class="group-card">
      <div class="row"><strong>Kooxda #${g.group_no}</strong><span class="pill ${g.status==='live'?'live':g.status==='completed'?'completed':'open'}">${g.status==='live'?'🔴 Live':g.status==='completed'?'Dhammaystiran':'Sugaya'}</span></div>
      <div class="member-list">${gm.length ? gm.map(m=>`<span class="member-chip">${escapeHtml(m.player_tag||"Player")}</span>`).join("") : '<span class="muted">Wali lama qeexin</span>'}</div>
      ${gr.length ? `<div style="margin-top:10px">${gr.map(r=>`<div class="result-row"><span class="medal">${medal[r.position]}</span> ${escapeHtml(r.player_tag||"")}</div>`).join("")}</div>` : ""}
      ${(g.live_link_1 || g.live_link_2) ? `<a href="#/live" class="btn btn-outline btn-sm" style="margin-top:10px">🔴 Daawo Live</a>` : ""}
    </div>`;
  }).join("")}
  `;
}

function openRegisterModal(t){
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `
    <div class="modal-sheet">
      <button class="close-x" id="mClose">✕</button>
      <h3>Diiwaan Gelinta — ${escapeHtml(t.title)}</h3>
      <p class="muted">Fee-ga tartankan waa ${money(t.entry_fee)}. Fadlan buuxi macluumaadkaaga si sax ah.</p>
      <div class="field"><label>Magaca oo saddexan (Full Name)</label><input id="rFullName" placeholder="Tusaale: Khalid Cabdullahi Xasan"></div>
      <div class="field"><label>Lambarka aad lacagta ka soo dirayso</label><input id="rPhone" placeholder="+252 6xxxxxxxx" type="tel"></div>
      <div class="field"><label>Player / Gamer tag (magaca lagaaga arki doono kuwa kale)</label><input id="rTag" placeholder="Tusaale: Khalid_FC"></div>
      <button class="btn btn-gold" id="rSubmit">Xaqiiji Diiwaan Gelinta</button>
    </div>`;
  document.body.appendChild(wrap);
  document.getElementById("mClose").onclick = () => wrap.remove();
  wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
  document.getElementById("rSubmit").onclick = async () => {
    const full_name = document.getElementById("rFullName").value.trim();
    const phone_number = document.getElementById("rPhone").value.trim();
    const player_tag = document.getElementById("rTag").value.trim();
    if (!full_name || full_name.split(/\s+/).length < 3){ toast("Fadlan geli magaca oo saddexan"); return; }
    if (!phone_number){ toast("Fadlan geli lambarka"); return; }
    const { error } = await sb.from("registrations").insert({
      tournament_id: t.id, user_id: CURRENT_USER.id, full_name, phone_number, player_tag: player_tag || null
    });
    if (error){ toast("Khalad: " + error.message); return; }
    toast("✅ Waad diiwaan gashay! Sug xaqiijinta lacagta.");
    wrap.remove();
    renderTournamentDetail(t.id);
  };
}

/* ---------------- LIVE ---------------- */
async function renderLive(){
  const { data: groups, error } = await sb.from("groups").select("*, tournaments(title)").eq("status","live");
  if (error){ $app().innerHTML = `<div class="empty-state">Khalad.</div>`; return; }
  $app().innerHTML = `<div class="section-title">🔴 Hadda Live</div><div id="liveList"></div>`;
  const box = document.getElementById("liveList");
  if (!groups || !groups.length){ box.innerHTML = `<div class="empty-state">Hadda ma jiro ciyaar live ah.</div>`; return; }
  box.innerHTML = groups.map(g => `
    <div class="card">
      <div class="row"><strong>${escapeHtml(g.tournaments ? g.tournaments.title : "")}</strong><span class="pill live">🔴 Kooxda #${g.group_no}</span></div>
      <div class="live-grid" style="margin-top:10px">
        ${g.live_link_1 ? `<div class="live-frame-wrap"><span class="live-tag">Shaashad 1</span><iframe src="${toEmbedUrl(g.live_link_1)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>` : ""}
        ${g.live_link_2 ? `<div class="live-frame-wrap"><span class="live-tag">Shaashad 2</span><iframe src="${toEmbedUrl(g.live_link_2)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>` : ""}
        ${(!g.live_link_1 && !g.live_link_2) ? '<div class="muted">Link-ka live-ga weli lama qeexin.</div>' : ""}
      </div>
    </div>
  `).join("");
}
function toEmbedUrl(url){
  try{
    if (/youtube\.com\/watch\?v=/.test(url)) return url.replace("watch?v=","embed/");
    if (/youtu\.be\//.test(url)) return url.replace("youtu.be/","www.youtube.com/embed/");
    return url;
  }catch(e){ return url; }
}

/* ---------------- LOGIN ---------------- */
let LOGIN_MODE = "login"; // or "signup"
function renderLogin(){
  $app().innerHTML = `
    <div class="auth-hero" style="padding-top:24px">
      <img src="icon-192.png" alt="">
      <h2>Ku soo biir Match Squater</h2>
      <p class="muted">Isticmaal email iyo password si aad u diiwaan gashato tartamada.</p>
    </div>
    <div class="tabs" style="justify-content:center">
      <div class="tab ${LOGIN_MODE==='login'?'active':''}" id="tabLogin">Soo Gal</div>
      <div class="tab ${LOGIN_MODE==='signup'?'active':''}" id="tabSignup">Is-diiwaan Geli</div>
    </div>
    <div class="card">
      <div class="field"><label>Email</label><input id="authEmail" type="email" placeholder="tusaale@gmail.com"></div>
      <div class="field"><label>Password</label><input id="authPass" type="password" placeholder="●●●●●●●●" minlength="6"></div>
      ${LOGIN_MODE==="signup" ? `<p class="muted" style="margin-top:-4px">Marka aad is-diiwaan gelisid, waxaad heli doontaa email xaqiijin ah — fur oo taabo link-ga, dabadeed soo gal.</p>` : ""}
      <button class="btn btn-gold" id="authSubmit" style="margin-top:6px">${LOGIN_MODE==="signup" ? "Samee Account" : "Soo Gal"}</button>
      ${LOGIN_MODE==="login" ? `<button class="btn btn-outline" id="forgotBtn" style="margin-top:10px">Ilaaway Password?</button>` : ""}
    </div>
  `;
  document.getElementById("tabLogin").onclick = () => { LOGIN_MODE="login"; renderLogin(); };
  document.getElementById("tabSignup").onclick = () => { LOGIN_MODE="signup"; renderLogin(); };
  document.getElementById("authSubmit").onclick = async () => {
    const email = document.getElementById("authEmail").value.trim();
    const pass = document.getElementById("authPass").value;
    if (!email || !pass || pass.length < 6){ toast("Geli email sax ah iyo password ugu yaraan 6 xaraf"); return; }
    if (LOGIN_MODE === "signup") await doSignUp(email, pass);
    else await doSignInPassword(email, pass);
  };
  const forgotBtn = document.getElementById("forgotBtn");
  if (forgotBtn) forgotBtn.onclick = () => doResetPassword(document.getElementById("authEmail").value.trim());
}

/* ---------------- ACCOUNT ---------------- */
async function renderAccount(){
  if (!CURRENT_USER){ renderLogin(); return; }
  const { data: regs } = await sb.from("registrations").select("*, tournaments(title, status)").eq("user_id", CURRENT_USER.id).order("created_at",{ascending:false});
  $app().innerHTML = `
    <div class="card">
      <div class="row"><h3>${escapeHtml(CURRENT_USER.email)}</h3></div>
      ${IS_ADMIN ? '<span class="pill open">Admin</span>' : ""}
      <button class="btn btn-outline" style="margin-top:12px" id="logoutBtn">Ka bax Account-ka</button>
    </div>
    <div class="section-title">Tartamada aan ku jiro</div>
    <div id="myRegs"></div>
  `;
  document.getElementById("logoutBtn").onclick = doSignOut;
  const box = document.getElementById("myRegs");
  if (!regs || !regs.length){ box.innerHTML = `<div class="empty-state">Wali ma aadan galin tartan.</div>`; return; }
  box.innerHTML = regs.map(r => `
    <a href="#/tournament/${r.tournament_id}" class="card" style="display:block">
      <div class="row"><strong>${escapeHtml(r.tournaments ? r.tournaments.title : "")}</strong>
      <span class="pill ${r.payment_status==='paid'?'open':'full'}">${r.payment_status==='paid'?'Paid':'Pending'}</span></div>
      <div class="muted">Player tag: ${escapeHtml(r.player_tag||"-")}</div>
    </a>
  `).join("");
}

/* ================= ADMIN ================= */
async function renderAdmin(){
  if (!CURRENT_USER || !IS_ADMIN){
    $app().innerHTML = `<div class="empty-state">Boggan waxaa geli kara admin-ka kaliya.</div>`;
    return;
  }
  const isSuper = (CURRENT_USER.email||"").toLowerCase() === SUPER_ADMIN_EMAIL;
  const tournaments = await fetchTournaments(null);
  const counts = await fetchCounts();

  $app().innerHTML = `
    <div class="section-title">Samee Tartan Cusub</div>
    <div class="card">
      <div class="field"><label>Magaca Tartanka</label><input id="nTitle" placeholder="Tusaale: eFootball Cup #1"></div>
      <div class="field"><label>Game-ga</label>
        <select id="nGame"><option value="efootball">eFootball</option><option value="fc_mobile">FC Mobile</option></select>
      </div>
      <div class="row" style="gap:10px">
        <div class="field" style="flex:1"><label>Entry Fee ($)</label><input id="nFee" type="number" value="1" min="0" step="0.5"></div>
        <div class="field" style="flex:1"><label>Target Players</label><input id="nTarget" type="number" value="40" min="6" step="1"></div>
      </div>
      <div class="row" style="gap:10px">
        <div class="field" style="flex:1"><label>App Fee %</label><input id="nFeePct" type="number" value="5" min="0" max="100"></div>
        <div class="field" style="flex:1"><label>1aad %</label><input id="nS1" type="number" value="65"></div>
      </div>
      <div class="row" style="gap:10px">
        <div class="field" style="flex:1"><label>2aad %</label><input id="nS2" type="number" value="20"></div>
        <div class="field" style="flex:1"><label>3aad %</label><input id="nS3" type="number" value="10"></div>
      </div>
      <div class="field"><label>Announcement (ikhtiyaari)</label><textarea id="nAnn" rows="2" placeholder="Faahfaahin dheeraad ah..."></textarea></div>
      <button class="btn btn-gold" id="createTBtn">➕ Samee Tartan</button>
    </div>

    <div class="section-title">Tartamadayda</div>
    <div id="adminTList">${tournaments.map(t => `
      <a href="#/admin/tournament/${t.id}" class="card" style="display:block">
        <div class="row"><h3>${escapeHtml(t.title)}</h3><span class="pill ${t.status}">${statusLabel(t.status)}</span></div>
        <div class="muted">${gameLabel(t.game)} · ${counts[t.id]||0}/${t.target_players} tartame · Fee ${money(t.entry_fee)}</div>
      </a>`).join("") || '<div class="empty-state">Wali ma aadan samayn tartan.</div>'}
    </div>

    ${isSuper ? `
    <div class="section-title">Maamulka Admin-ka (Super Admin oo kaliya)</div>
    <div class="card">
      <div class="field"><label>Gmail-ka admin-ka cusub</label><input id="newAdminEmail" placeholder="tusaale@gmail.com" type="email"></div>
      <button class="btn btn-gold" id="addAdminBtn">Ku dar Admin</button>
      <div id="adminsList" style="margin-top:14px"></div>
    </div>` : ""}
  `;

  document.getElementById("createTBtn").onclick = async () => {
    const title = document.getElementById("nTitle").value.trim();
    if (!title){ toast("Geli magaca tartanka"); return; }
    const payload = {
      title,
      game: document.getElementById("nGame").value,
      entry_fee: parseFloat(document.getElementById("nFee").value)||1,
      target_players: parseInt(document.getElementById("nTarget").value)||40,
      fee_percent: parseFloat(document.getElementById("nFeePct").value)||5,
      split_first: parseFloat(document.getElementById("nS1").value)||65,
      split_second: parseFloat(document.getElementById("nS2").value)||20,
      split_third: parseFloat(document.getElementById("nS3").value)||10,
      announcement: document.getElementById("nAnn").value.trim() || null,
      created_by: CURRENT_USER.email,
      status: "open"
    };
    const { error } = await sb.from("tournaments").insert(payload);
    if (error){ toast("Khalad: " + error.message); return; }
    toast("✅ Tartanka waa la sameeyay");
    renderAdmin();
  };

  if (isSuper){
    document.getElementById("addAdminBtn").onclick = async () => {
      const email = document.getElementById("newAdminEmail").value.trim().toLowerCase();
      if (!email){ toast("Geli email"); return; }
      const { error } = await sb.from("admins").insert({ email, added_by: CURRENT_USER.email });
      if (error){ toast("Khalad: " + error.message); return; }
      toast("✅ Admin waa la daray");
      document.getElementById("newAdminEmail").value = "";
      loadAdminsList();
    };
    loadAdminsList();
  }
}

async function loadAdminsList(){
  const { data, error } = await sb.from("admins").select("*").order("created_at");
  const box = document.getElementById("adminsList");
  if (!box) return;
  if (error){ box.innerHTML = `<div class="muted">Khalad.</div>`; return; }
  box.innerHTML = `<div class="table-wrap"><table><tr><th>Email</th><th>Ku daray</th></tr>
    ${(data||[]).map(a=>`<tr><td>${escapeHtml(a.email)}</td><td>${escapeHtml(a.added_by)}</td></tr>`).join("")}
  </table></div>`;
}

/* ---------------- ADMIN: TOURNAMENT MANAGE ---------------- */
async function renderAdminTournament(id){
  if (!CURRENT_USER || !IS_ADMIN){ $app().innerHTML = `<div class="empty-state">Admin oo kaliya.</div>`; return; }
  const { data: t } = await sb.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t){ $app().innerHTML = `<div class="empty-state">Lama helin.</div>`; return; }
  const { data: regs } = await sb.from("registrations").select("*").eq("tournament_id", id).order("created_at");
  const { data: groups } = await sb.from("groups").select("*").eq("tournament_id", id).order("group_no");
  const { data: members } = await sb.from("group_members").select("*, registrations(player_tag, full_name)").in("group_id",(groups||[]).map(g=>g.id).length?(groups||[]).map(g=>g.id):["00000000-0000-0000-0000-000000000000"]);
  const { data: results } = await sb.from("results").select("*").in("group_id",(groups||[]).map(g=>g.id).length?(groups||[]).map(g=>g.id):["00000000-0000-0000-0000-000000000000"]);

  $app().innerHTML = `
    <a href="#/admin" class="muted">← Dib ugu noqo Admin</a>
    <div class="card" style="margin-top:10px">
      <div class="row"><h3>${escapeHtml(t.title)}</h3><span class="pill ${t.status}">${statusLabel(t.status)}</span></div>
      <div class="muted">${gameLabel(t.game)} · Fee ${money(t.entry_fee)} · ${regs.length}/${t.target_players}</div>
      <div class="field" style="margin-top:12px"><label>Beddel Status</label>
        <select id="statusSel">
          ${["open","full","live","completed"].map(s=>`<option value="${s}" ${t.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}
        </select>
      </div>
      <button class="btn btn-outline" id="saveStatusBtn">Kaydi Status</button>
      <button class="btn btn-danger" id="delTBtn" style="margin-top:8px">🗑 Tirtir Tartanka</button>
    </div>

    <div class="section-title">Diiwaan gelayaasha (${regs.length})</div>
    <div class="card table-wrap">
      <table>
        <tr><th>Magaca</th><th>Lambarka</th><th>Tag</th><th>Lacag</th><th></th></tr>
        ${regs.map(r=>`<tr>
          <td>${escapeHtml(r.full_name)}</td>
          <td>${escapeHtml(r.phone_number)}</td>
          <td>${escapeHtml(r.player_tag||"-")}</td>
          <td><button class="btn btn-sm ${r.payment_status==='paid'?'btn-outline':'btn-gold'}" data-toggle-pay="${r.id}" data-cur="${r.payment_status}">${r.payment_status==='paid'?'Paid ✓':'Mark Paid'}</button></td>
          <td><button class="btn btn-sm btn-danger" data-del-reg="${r.id}">✕</button></td>
        </tr>`).join("")}
      </table>
    </div>
    <button class="btn btn-gold" id="makeGroupsBtn" ${(!regs.length || (groups&&groups.length)) ? "disabled":""}>⚙️ Samee Kooxo (6 tartame kooxdiiba)</button>

    <div class="section-title">Kooxaha</div>
    <div id="adminGroups">
      ${(groups&&groups.length) ? groups.map(g=>adminGroupCard(g, (members||[]).filter(m=>m.group_id===g.id), (results||[]).filter(r=>r.group_id===g.id))).join("") : '<div class="empty-state">Wali lama samayn kooxo.</div>'}
    </div>
  `;

  document.getElementById("saveStatusBtn").onclick = async () => {
    const { error } = await sb.from("tournaments").update({status: document.getElementById("statusSel").value}).eq("id", id);
    if (error) toast("Khalad: "+error.message); else { toast("✅ La kaydiyay"); renderAdminTournament(id); }
  };
  document.getElementById("delTBtn").onclick = async () => {
    if (!confirm("Ma hubtaa inaad tirtirto tartankan?")) return;
    const { error } = await sb.from("tournaments").delete().eq("id", id);
    if (error) toast("Khalad: "+error.message); else { toast("La tirtiray"); location.hash = "#/admin"; }
  };
  document.querySelectorAll("[data-toggle-pay]").forEach(btn=>{
    btn.onclick = async () => {
      const newStatus = btn.dataset.cur === "paid" ? "pending" : "paid";
      const { error } = await sb.from("registrations").update({payment_status:newStatus}).eq("id", btn.dataset.togglePay);
      if (error) toast("Khalad: "+error.message); else renderAdminTournament(id);
    };
  });
  document.querySelectorAll("[data-del-reg]").forEach(btn=>{
    btn.onclick = async () => {
      if (!confirm("Tirtir diiwaan gelintan?")) return;
      const { error } = await sb.from("registrations").delete().eq("id", btn.dataset.delReg);
      if (error) toast("Khalad: "+error.message); else renderAdminTournament(id);
    };
  });
  const gBtn = document.getElementById("makeGroupsBtn");
  if (gBtn) gBtn.onclick = () => makeGroups(t, regs);

  bindGroupActions(id);
}

function adminGroupCard(g, members, results){
  const medal = {1:"🥇",2:"🥈",3:"🥉"};
  const resByPos = {}; results.forEach(r=>resByPos[r.position]=r.registration_id);
  return `<div class="group-card" data-group="${g.id}">
    <div class="row"><strong>Kooxda #${g.group_no}</strong>
      <select class="btn-sm" data-group-status="${g.id}" style="padding:6px 8px;border-radius:8px;background:var(--bg2);color:var(--text);border:1px solid var(--border)">
        ${["pending","live","completed"].map(s=>`<option value="${s}" ${g.status===s?"selected":""}>${s}</option>`).join("")}
      </select>
    </div>
    <div class="member-list">${members.map(m=>`<span class="member-chip">${escapeHtml(m.registrations?.player_tag || m.registrations?.full_name || "Player")}</span>`).join("")}</div>
    <div class="field" style="margin-top:10px"><label>Live Link 1</label><input data-live1="${g.id}" value="${escapeHtml(g.live_link_1||"")}" placeholder="https://youtube.com/..."></div>
    <div class="field"><label>Live Link 2</label><input data-live2="${g.id}" value="${escapeHtml(g.live_link_2||"")}" placeholder="https://youtube.com/..."></div>
    <button class="btn btn-outline btn-sm" data-save-live="${g.id}">Kaydi Links</button>
    <div class="field" style="margin-top:12px"><label>Natiijada (dooro tartame kasta)</label>
      ${[1,2,3].map(pos=>`
        <select data-result-pos="${g.id}:${pos}" style="margin-bottom:6px">
          <option value="">${medal[pos]} ${pos}aad — dooro...</option>
          ${members.map(m=>`<option value="${m.registration_id}" ${resByPos[pos]===m.registration_id?"selected":""}>${escapeHtml(m.registrations?.player_tag||m.registrations?.full_name||"")}</option>`).join("")}
        </select>`).join("")}
    </div>
    <button class="btn btn-gold btn-sm" data-save-results="${g.id}">Kaydi Natiijada</button>
  </div>`;
}

async function makeGroups(t, regs){
  if (!regs.length) return;
  const size = 6;
  const groupCount = Math.ceil(regs.length/size);
  for (let i=0;i<groupCount;i++){
    const { data: g, error } = await sb.from("groups").insert({tournament_id:t.id, group_no:i+1}).select().single();
    if (error){ toast("Khalad: "+error.message); return; }
    const slice = regs.slice(i*size,(i+1)*size);
    const rows = slice.map(r => ({group_id:g.id, registration_id:r.id}));
    if (rows.length){
      const { error: e2 } = await sb.from("group_members").insert(rows);
      if (e2){ toast("Khalad: "+e2.message); return; }
    }
  }
  toast("✅ Kooxaha waa la sameeyay");
  renderAdminTournament(t.id);
}

function bindGroupActions(tournamentId){
  document.querySelectorAll("[data-group-status]").forEach(sel=>{
    sel.onchange = async () => {
      const { error } = await sb.from("groups").update({status: sel.value}).eq("id", sel.dataset.groupStatus);
      if (error) toast("Khalad: "+error.message); else toast("✅ La cusboonaysiiyay");
    };
  });
  document.querySelectorAll("[data-save-live]").forEach(btn=>{
    btn.onclick = async () => {
      const gid = btn.dataset.saveLive;
      const l1 = document.querySelector(`[data-live1="${gid}"]`).value.trim();
      const l2 = document.querySelector(`[data-live2="${gid}"]`).value.trim();
      const { error } = await sb.from("groups").update({live_link_1:l1||null, live_link_2:l2||null}).eq("id", gid);
      if (error) toast("Khalad: "+error.message); else toast("✅ Links waa la kaydiyay");
    };
  });
  document.querySelectorAll("[data-save-results]").forEach(btn=>{
    btn.onclick = async () => {
      const gid = btn.dataset.saveResults;
      for (const pos of [1,2,3]){
        const sel = document.querySelector(`[data-result-pos="${gid}:${pos}"]`);
        const regId = sel.value;
        if (!regId) continue;
        const { error } = await sb.from("results").upsert({group_id:gid, position:pos, registration_id:regId}, {onConflict:"group_id,position"});
        if (error){ toast("Khalad: "+error.message); return; }
      }
      toast("✅ Natiijada waa la kaydiyay");
      renderAdminTournament(tournamentId);
    };
  });
}

/* ---------------- BOOT ---------------- */
(async function boot(){
  setupNav();
  await initAuth();
  await route();
  updateBottomNav();
})();
