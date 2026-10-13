// The pre-launch letter served by the site-access gate (server/site-access.ts).
// Self-contained: its only assets live under /coming-soon/ so the gate can serve them.
export const COMING_SOON_HTML = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>সেরা খাবার - Sera Khabar</title>
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="সেরা খাবারের নতুন ওয়েবসাইট শীঘ্রই চালু হবে।">
<link rel="icon" href="/coming-soon/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/coming-soon/favicon.png" type="image/png" sizes="512x512">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@200;300;400;600&family=Bodoni+Moda:opsz,wght@6..96,400&family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">
<style>
/* Layout: one centred letter column on warm paper, like a printed note — monogram, salutation, justified body, signature. */
:root{
  --paper:#fbfaf7; --ink:#1a1a18; --ink-2:#3b3b37; --ink-3:rgba(26,26,24,.45); --hair:rgba(26,26,24,.14); --leaf:#015128;
  --mono:"Bodoni Moda","Didot","Bodoni 72",serif;
  --text:"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif;
  --hand:"Mrs Saint Delafield","Snell Roundhand",cursive;
  --ease-out:cubic-bezier(0.23,1,0.32,1);
  color-scheme:light;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{height:100%;margin:0}
body{background:var(--paper);color:var(--ink);font-family:var(--text);-webkit-font-smoothing:antialiased}

.letter{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:clamp(56px,12vh,120px) 24px 0}
.col{width:min(600px,100%);display:flex;flex-direction:column;align-items:center}

/* Brand logo in place of the monogram */
.logo{height:clamp(96px,16vw,132px);width:auto}
.mono{position:relative;width:180px;height:176px;font-family:var(--mono);font-weight:400;color:var(--ink);line-height:1}
.mono .s{position:absolute;left:14px;top:0;font-size:150px}
.mono .k{position:absolute;left:78px;top:58px;font-size:118px}

.hello{margin:clamp(56px,9vh,88px) 0 0;font-weight:600;font-size:clamp(1.05rem,2.6vw,1.2rem);letter-spacing:.04em;text-align:center}
.body{margin-top:34px;display:grid;gap:26px;width:100%}
.body p{margin:0;font-weight:600;font-size:clamp(1.02rem,2.5vw,1.14rem);line-height:2;letter-spacing:.02em;color:var(--ink);text-align:center;text-align-last:center;text-wrap:pretty;hyphens:none}
.body a{display:inline-block;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums;text-decoration-line:underline;text-decoration-thickness:1.5px;text-underline-offset:5px;text-decoration-color:rgba(26,26,24,.35);
  transition:text-decoration-color 150ms ease,color 150ms ease,transform 160ms var(--ease-out)}
@media (hover:hover) and (pointer:fine){.body a:hover{text-decoration-color:var(--leaf);color:var(--leaf)}}
.body a:active{transform:scale(0.97)}
.body a:focus-visible{outline:2px solid var(--leaf);outline-offset:4px;border-radius:2px}

.sign{margin-top:clamp(72px,12vh,120px);display:grid;justify-items:center;gap:4px;text-align:center}
.sign .hand{font-family:var(--hand);font-size:clamp(3rem,9vw,3.8rem);line-height:1;color:var(--ink);padding:0 14px;margin-bottom:6px;
  clip-path:inset(0 100% 0 0)}
.sign .name{font-weight:600;font-size:1.08rem;letter-spacing:.04em}
.sign .role{font-weight:300;font-size:.98rem;letter-spacing:.04em;color:var(--ink-2)}

footer{margin-top:auto;width:min(600px,100%);padding:clamp(64px,10vh,96px) 0 calc(26px + env(safe-area-inset-bottom,0px));display:grid;justify-items:center;gap:14px}
.gate{display:grid;justify-items:center;gap:8px}
.toggle{background:none;border:0;padding:4px 2px;cursor:pointer;font:inherit;font-size:12px;letter-spacing:.08em;color:var(--ink-3);
  transition:color 150ms ease}
@media (hover:hover) and (pointer:fine){.toggle:hover{color:var(--ink)}}
.toggle:focus-visible{outline:1px solid var(--ink);outline-offset:3px}
form{display:flex;align-items:center;border-bottom:1px solid var(--ink)}
form:focus-within{border-color:var(--leaf)}
input{width:190px;height:38px;border:0;background:transparent;font:inherit;font-size:16px;padding:0 6px;color:var(--ink)}
input:focus-visible{outline:none}
.go{height:38px;border:0;background:none;padding:0 6px;font:inherit;font-size:14px;font-weight:600;color:var(--leaf);cursor:pointer;transition:transform 160ms var(--ease-out)}
.go:active{transform:scale(0.97)}
.msg{margin:0;min-height:1.4em;font-size:12px;color:var(--ink-2);text-align:center}
.msg[data-state="err"]{color:#b4321f}
.credit{display:inline-flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink)}
.credit .lbl{font-family:"Helvetica Neue",Arial,sans-serif;font-size:8px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;margin-right:-.28em;color:rgba(26,26,24,.55)}
.credit .bar{width:1px;height:16px;background:rgba(26,26,24,.2)}
.credit img{height:22px;width:auto;transition:transform 300ms var(--ease-out)}
@media (hover:hover) and (pointer:fine){.credit:hover img{transform:scale(1.05)}}
.copy{font-family:"Helvetica Neue",Arial,sans-serif;font-size:8px;color:var(--ink-3)}

/* Entrance: one quiet sequence — monogram, salutation, paragraphs, then the signature writes itself */
.in{opacity:0;filter:blur(8px);transform:translateY(8px);animation:appear 900ms var(--ease-out) forwards}
.logo.in{transform:scale(0.96);animation-duration:1100ms}
.d1{animation-delay:.15s}.d2{animation-delay:.55s}.d3{animation-delay:.8s}.d4{animation-delay:1.05s}.d5{animation-delay:2.3s}.d6{animation-delay:2.5s}
.sign .hand{animation:write 1.6s cubic-bezier(0.77,0,0.175,1) 1.5s forwards}
@keyframes appear{to{opacity:1;filter:blur(0);transform:none}}
@keyframes write{to{clip-path:inset(0 0 0 0)}}
@media (prefers-reduced-motion:reduce){
  .in{filter:none;transform:none;animation:fade 300ms ease forwards}
  .sign .hand{animation:none;clip-path:none}
}
@keyframes fade{to{opacity:1}}

</style>
</head>
<body>
<main class="letter">
  <div class="col">
    <img class="logo in d1" src="/coming-soon/sera-khabar-logo.webp" alt="সেরা খাবার - Sera Khabar">

    <p class="hello in d2">প্রিয় গ্রাহক,</p>

    <div class="body">
      <p class="in d3">সেরা খাবারে আপনাকে স্বাগতম। আমাদের নতুন ওয়েবসাইটের কাজ চলছে। খুব শীঘ্রই চালু হবে।</p>
      <p class="in d4">এখন অর্ডার করতে কল করুন <a href="tel:+8801310980289">01310-980289</a> নম্বরে, অথবা হোয়াটসঅ্যাপে মেসেজ দিন <a href="https://wa.me/8801303103540" target="_blank" rel="noopener">01303-103540</a> নম্বরে।</p>
      <p class="in d4">ধন্যবাদ।</p>
    </div>

    <div class="sign">
      <span class="hand" aria-hidden="true">Jahidul Islam</span>
      <span class="name in d5">জাহিদুল ইসলাম</span>
      <span class="role in d5">প্রতিষ্ঠাতা, সেরা খাবার</span>
    </div>
  </div>

  <footer class="in d6">
    <div class="gate">
      <button class="toggle" type="button" aria-expanded="false" id="toggle">টিম অ্যাক্সেস</button>
      <form id="gate" hidden>
        <label for="pw" style="position:absolute;left:-9999px">টিম পাসওয়ার্ড</label>
        <input id="pw" type="password" placeholder="পাসওয়ার্ড" autocomplete="current-password">
        <button class="go" type="submit">খুলুন →</button>
      </form>
      <p class="msg" id="msg" aria-live="polite"></p>
    </div>
    <a class="credit" href="https://api.whatsapp.com/send/?phone=8801733670129" target="_blank" rel="noopener">
      <span class="lbl">Designed &amp; Engineered by</span><span class="bar" aria-hidden="true"></span>
      <img src="/coming-soon/arc-labs-emblem.webp" alt="Arc Labs Corporation" width="173" height="72">
    </a>
    <span class="copy">© 2026 সেরা খাবার - Sera Khabar</span>
  </footer>
</main>
<script>
const t=document.getElementById("toggle"), f=document.getElementById("gate"), m=document.getElementById("msg"), pw=document.getElementById("pw");
t.addEventListener("click",()=>{f.hidden=!f.hidden;t.setAttribute("aria-expanded",String(!f.hidden));if(!f.hidden)pw.focus();});
f.addEventListener("submit",async(e)=>{e.preventDefault();
  const btn=f.querySelector(".go"); btn.disabled=true; m.dataset.state=""; m.textContent="";
  try{
    const r=await fetch("/api/site-access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw.value})});
    if(r.ok){m.textContent="খোলা হচ্ছে…";location.reload();return;}
    m.dataset.state="err";m.textContent="পাসওয়ার্ডটি সঠিক নয়। আবার চেষ্টা করুন।";
    if(!matchMedia("(prefers-reduced-motion: reduce)").matches)f.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(5px)"},{transform:"translateX(-3px)"},{transform:"translateX(0)"}],{duration:280,easing:"cubic-bezier(0.23,1,0.32,1)"});
    pw.select();
  }catch{m.dataset.state="err";m.textContent="সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।";}
  finally{btn.disabled=false;}
});
</script>
</body>
</html>
`;
