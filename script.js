/* Linux Atlas interactive behavior */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  // Bright, moving particle field with pointer interaction.
  const canvas = $("#particles"), ctx = canvas.getContext("2d");
  let w=0,h=0,dpr=1,particles=[],mouse={x:-9999,y:-9999};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2); w=innerWidth; h=innerHeight;
    canvas.width=w*dpr; canvas.height=h*dpr; canvas.style.width=w+"px"; canvas.style.height=h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.min(115,Math.floor(w*h/10500));
    particles=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.42,vy:(Math.random()-.5)*.42,r:Math.random()*1.8+.7,a:Math.random()*.55+.18}));
  }
  function draw(){
    ctx.clearRect(0,0,w,h);
    particles.forEach((p,i)=>{
      if(!reduced){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;}
      const dx=mouse.x-p.x,dy=mouse.y-p.y,dist=Math.hypot(dx,dy);
      if(dist<130&&dist>0){p.x-=dx/dist*.16;p.y-=dy/dist*.16;}
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(112,220,255,${p.a})`;ctx.fill();
      for(let j=i+1;j<particles.length;j++){const q=particles[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<105){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(91,180,240,${(1-d/105)*.19})`;ctx.lineWidth=.7;ctx.stroke();}}
    });
    requestAnimationFrame(draw);
  }
  addEventListener("resize",resize);addEventListener("pointermove",e=>{mouse.x=e.clientX;mouse.y=e.clientY;},{passive:true});
  resize();draw();

  // Theme toggle, persisted locally.
  const themeToggle=$("#themeToggle");
  if(localStorage.getItem("linux-atlas-theme")==="light")document.body.classList.add("light");
  themeToggle.addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem("linux-atlas-theme",document.body.classList.contains("light")?"light":"dark");themeToggle.textContent=document.body.classList.contains("light")?"☾":"☼";});
  themeToggle.textContent=document.body.classList.contains("light")?"☾":"☼";

  // A safe virtual file system; no commands are passed to the real OS.
  const output=$("#terminalOutput"), input=$("#terminalInput"), form=$("#terminalForm");
  let cwd="/home/student", files={"/home/student/README.txt":"Welcome to Linux Atlas practice lab.\nThis is a virtual file, not a real system file."}, dirs=["/","/home","/home/student"], history=[], histIndex=0;
  const normalize=(path)=>{
    let parts=(path.startsWith("/")?path:cwd+"/"+path).split("/"),out=[];
    for(const p of parts){if(!p||p===".")continue;if(p==="..")out.pop();else out.push(p);}
    return "/"+out.join("/");
  };
  const parent=p=>p.split("/").slice(0,-1).join("/")||"/";
  const base=p=>p.split("/").pop()||"/";
  const exists=p=>dirs.includes(p)||Object.prototype.hasOwnProperty.call(files,p);
  const print=(text,cls="")=>{const p=document.createElement("p");if(cls)p.className=cls;p.textContent=text;output.appendChild(p);output.scrollTop=output.scrollHeight;};
  const listDir=path=>[...dirs.filter(d=>d!==path&&parent(d)===path).map(base),...Object.keys(files).filter(f=>parent(f)===path).map(base)].sort();
  function run(raw){
    const cmd=raw.trim();if(!cmd)return;print(`student@linux-lab:${cwd.replace("/home/student","~")||"/"}$ ${cmd}`,"term-command");history.push(cmd);histIndex=history.length;
    const parts=cmd.match(/"(?:[^"\\]|\\.)*"|'[^']*'|[^\s]+/g)||[], args=parts.map(s=>s.replace(/^["']|["']$/g,""));
    const name=args[0],a=args.slice(1);let result="",cls="";
    const pathArg=x=>normalize(x||cwd);
    switch(name){
      case "help": result="فرمان‌های پشتیبانی‌شده:\nhelp, pwd, whoami, uname, date, clear, history, ls [-la], cd <dir>, mkdir <dir>, touch <file>, cat <file>, echo <text> > <file>, rm <file>, rmdir <dir>, tree, wc <file>, grep <word> <file>, reset-lab\nهمه عملیات فقط روی فایل‌سیستم مجازی انجام می‌شوند.";break;
      case "pwd":result=cwd;break;
      case "whoami":result="student";break;
      case "uname":result=a.includes("-a")?"Linux linux-atlas 6.x #1 SMP x86_64 GNU/Linux":"Linux";break;
      case "date":result=new Date().toString();break;
      case "clear":output.innerHTML="";return;
      case "history":result=history.map((v,i)=>`${i+1}  ${v}`).join("\n")||"تاریخچه خالی است.";break;
      case "ls":{let target=a.find(x=>!x.startsWith("-"))||cwd;target=pathArg(target);if(!dirs.includes(target)){result=`ls: نمی‌توان به '${target}' دسترسی داشت`;cls="term-error";break;}const items=listDir(target);result=a.includes("-la")?`total ${items.length}\ndrwxr-xr-x  ${items.join("\ndrwxr-xr-x  ")||"(خالی)"}`:items.join("  ")||"(پوشه خالی)";break;}
      case "cd":{const dest=pathArg(a[0]||"/home/student");if(dirs.includes(dest)){cwd=dest;result="";}else{result=`cd: پوشه‌ای با این نام وجود ندارد: ${a[0]||dest}`;cls="term-error";}break;}
      case "mkdir":{if(!a[0]){result="کاربرد: mkdir <نام‌پوشه>";cls="term-error";break;}const dest=pathArg(a[0]);if(exists(dest)){result=`mkdir: '${a[0]}' از قبل وجود دارد`;cls="term-error";}else{dirs.push(dest);result=`پوشه ساخته شد: ${dest}`;cls="term-success";}break;}
      case "touch":{if(!a[0]){result="کاربرد: touch <نام‌فایل>";cls="term-error";break;}const dest=pathArg(a[0]);if(dirs.includes(dest)){result=`touch: '${a[0]}' یک پوشه است`;cls="term-error";}else{if(!(dest in files))files[dest]="";result=`فایل آماده است: ${dest}`;cls="term-success";}break;}
      case "cat":{const dest=pathArg(a[0]||"");if(dest in files)result=files[dest]||"(فایل خالی است)";else{result=`cat: فایل پیدا نشد: ${a[0]||""}`;cls="term-error";}break;}
      case "echo":{const redirect=parts.indexOf(">");if(redirect>=0&&parts[redirect+1]){const dest=pathArg(parts[redirect+1]);const value=parts.slice(1,redirect).join(" ").replace(/^["']|["']$/g,"");if(dirs.includes(dest)){result=`echo: مقصد یک پوشه است`;cls="term-error";}else{files[dest]=value+"\n";result=`متن در ${dest} نوشته شد.`;cls="term-success";}}else result=a.join(" ").replace(/^["']|["']$/g,"");break;}
      case "rm":{const dest=pathArg(a[0]||"");if(dest in files){delete files[dest];result=`فایل حذف شد: ${dest}`;cls="term-success";}else{result=`rm: فایل پیدا نشد: ${a[0]||""}`;cls="term-error";}break;}
      case "rmdir":{const dest=pathArg(a[0]||"");if(!dirs.includes(dest)||dest==="/"){result="rmdir: پوشه معتبر نیست";cls="term-error";}else if(listDir(dest).length){result="rmdir: پوشه خالی نیست";cls="term-error";}else{dirs=dirs.filter(d=>d!==dest);result=`پوشه حذف شد: ${dest}`;cls="term-success";}break;}
      case "tree":{const walk=(p,indent="")=>listDir(p).map(n=>{const full=normalize(p+"/"+n);return indent+"├── "+n+(dirs.includes(full)?"\n"+walk(full,indent+"│   "):"");}).join("\n");result=".\n"+walk(cwd);break;}
      case "wc":{const dest=pathArg(a[0]||"");if(dest in files){const t=files[dest],lines=t? t.split("\n").filter((v,i,ar)=>v!==""||i<ar.length-1).length:0;result=`${lines} ${t.trim()?t.trim().split(/\s+/).length:0} ${t.length} ${a[0]}`;}else{result="wc: فایل پیدا نشد";cls="term-error";}break;}
      case "grep":{const needle=a[0],dest=pathArg(a[1]||"");if(dest in files&&needle){result=files[dest].split("\n").filter(line=>line.includes(needle)).join("\n")||"عبارتی پیدا نشد.";}else{result="کاربرد: grep <عبارت> <فایل>";cls="term-error";}break;}
      case "reset-lab":cwd="/home/student";files={"/home/student/README.txt":"Welcome to Linux Atlas practice lab.\nThis is a virtual file, not a real system file."};dirs=["/","/home","/home/student"];result="محیط تمرین بازنشانی شد.";cls="term-success";break;
      case "sudo":result="در این آزمایشگاه مجازی، sudo و دسترسی مدیریتی غیرفعال است.";cls="term-error";break;
      default:result=`فرمان ناشناخته: ${name}. برای راهنما help را اجرا کن.`;cls="term-error";
    }
    if(result)print(result,cls);
  }
  form.addEventListener("submit",e=>{e.preventDefault();run(input.value);input.value="";});
  input.addEventListener("keydown",e=>{if(e.key==="ArrowUp"){e.preventDefault();histIndex=Math.max(0,histIndex-1);input.value=history[histIndex]||"";}if(e.key==="ArrowDown"){e.preventDefault();histIndex=Math.min(history.length,histIndex+1);input.value=history[histIndex]||"";}});
  $("#clearTerminal").addEventListener("click",()=>output.innerHTML="");
  $$(".command-chips button").forEach(b=>b.addEventListener("click",()=>{run(b.dataset.cmd);}));

  // Quiz based on the lecture topics, with immediate feedback.
  const questions=[
    {q:"از نظر فنی، Linux در اصل به چه چیزی اشاره دارد؟",o:["محیط دسکتاپ","هسته سیستم‌عامل","مدیر بسته","یک زبان برنامه‌نویسی"],a:1,e:"Linux نام هسته است؛ توزیع‌ها آن را همراه ابزارها و برنامه‌ها ارائه می‌کنند."},
    {q:"پروژه GNU با چه هدفی آغاز شد؟",o:["ساخت یک بازی رایانه‌ای","ساخت یک سیستم‌عامل آزاد","جایگزینی اینترنت","طراحی یک پردازنده"],a:1,e:"پروژه GNU در سال ۱۹۸۳ با هدف ساخت یک سیستم‌عامل آزاد آغاز شد."},
    {q:"چه کسی نخستین نسخه هسته لینوکس را در سال ۱۹۹۱ منتشر کرد؟",o:["ریچارد استالمن","دنیس ریچی","لینوس توروالدز","کن تامپسون"],a:2,e:"لینوس توروالدز توسعه هسته لینوکس را در سال ۱۹۹۱ منتشر کرد."},
    {q:"کدام بخش منابع سخت‌افزاری و فرایندها را مدیریت می‌کند؟",o:["Kernel","مرورگر","ویرایشگر متن","مدیر پنجره"],a:0,e:"هسته مسئول زمان‌بندی فرایند، حافظه، درایورها، شبکه و فایل‌سیستم است."},
    {q:"کدام گزینه نمونه‌ای از شِل است؟",o:["Bash","PNG","HTML","BIOS"],a:0,e:"Bash یک شِل رایج برای اجرای فرمان‌ها و نوشتن اسکریپت است."},
    {q:"مسیر ریشه در ساختار فایل لینوکس چیست؟",o:["C:\\","/root فقط","/","home:"],a:2,e:"ریشه درخت فایل با / نمایش داده می‌شود؛ /root پوشه خانگی کاربر root است."},
    {q:"برای چه کاری از مدیر بسته استفاده می‌شود؟",o:["افزایش فیزیکی RAM","نصب و به‌روزرسانی نرم‌افزار","ساخت حساب ایمیل","طراحی اسلاید"],a:1,e:"مدیر بسته نرم‌افزارها و وابستگی‌هایشان را از مخازن مدیریت می‌کند."},
    {q:"کدام توزیع به‌طور ویژه برای آزمون نفوذ و ارزیابی امنیت شناخته می‌شود؟",o:["Kali Linux","Linux Mint","Zorin OS","Elementary OS"],a:0,e:"Kali مجموعه‌ای از ابزارهای امنیتی دارد و باید در محیط‌های مجاز استفاده شود."},
    {q:"System call چه نقشی دارد؟",o:["تبدیل فونت","رابط کنترل‌شده برنامه با هسته","ساخت خودکار رمز عبور","فشرده‌سازی تصویر"],a:1,e:"برنامه‌های فضای کاربر از system call برای درخواست خدمات هسته استفاده می‌کنند."},
    {q:"کدام مورد با فلسفه رایج ابزارهای یونیکسی و لینوکسی سازگارتر است؟",o:["یک برنامه بسیار بزرگ برای همه‌چیز","ابزارهای کوچک و ترکیب‌پذیر","مخفی نگه‌داشتن همه رابط‌ها","حذف خط فرمان"],a:1,e:"ابزارهای کوچک با ورودی/خروجی استاندارد و پایپ می‌توانند به هم متصل شوند."}
  ];

  const creatorCard = document.querySelector(".creator-card");

if (creatorCard) {
    creatorCard.style.opacity = "0";
    creatorCard.style.transform = "translateY(20px)";
    creatorCard.style.transition =
        "opacity 0.7s ease, transform 0.7s ease";

    requestAnimationFrame(() => {
        creatorCard.style.opacity = "1";
        creatorCard.style.transform = "translateY(0)";
    });
}
  let qi=0,answers=Array(questions.length).fill(null);
  const faNums=n=>String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
  function renderQuiz(){
    const content=$("#quizContent"),q=questions[qi],answered=answers[qi]!==null;
    $("#quizCounter").textContent=`پرسش ${faNums(qi+1)} از ${faNums(questions.length)}`;
    $("#quizProgress").style.width=((qi+1)/questions.length*100)+"%";
    $("#quizScore").textContent=`امتیاز: ${faNums(answers.filter((a,i)=>a===questions[i].a).length)}`;
    $("#prevQuestion").classList.toggle("hidden",qi===0);
    $("#nextQuestion").classList.toggle("hidden",qi===questions.length-1);
    $("#restartQuiz").classList.add("hidden");
    content.innerHTML=`<h3 class="quiz-question">${q.q}</h3><div class="quiz-options">${q.o.map((o,i)=>{let cls="";if(answered&&i===q.a)cls="correct";else if(answered&&i===answers[qi])cls="wrong";return `<button class="quiz-option ${cls}" data-answer="${i}" ${answered?"disabled":""}>${String.fromCharCode(65+i)}. ${o}</button>`;}).join("")}</div>${answered?`<div class="quiz-feedback ${answers[qi]===q.a?"good":"bad"}">${answers[qi]===q.a?"درست است!":"این پاسخ درست نیست."} ${q.e}</div>`:""}`;
    $$(".quiz-option",content).forEach(b=>b.addEventListener("click",()=>{answers[qi]=Number(b.dataset.answer);renderQuiz();}));
  }
  $("#prevQuestion").addEventListener("click",()=>{if(qi>0){qi--;renderQuiz();}});
  $("#nextQuestion").addEventListener("click",()=>{if(qi<questions.length-1){qi++;renderQuiz();}else showResults();});
  $("#restartQuiz").addEventListener("click",()=>{qi=0;answers=Array(questions.length).fill(null);renderQuiz();});
  function showResults(){
    const score=answers.filter((a,i)=>a===questions[i].a).length;
    $("#quizCounter").textContent="آزمون تمام شد";
    $("#quizScore").textContent=`امتیاز: ${faNums(score)}`;
    $("#quizProgress").style.width="100%";
    $("#quizContent").innerHTML=`<div class="result-box"><div class="result-score">${score}/${questions.length}</div><h3>${score>=8?"عالیه!":score>=5?"شروع خوبی است!":"ادامه بده و دوباره تمرین کن."}</h3><p>برای تثبیت یادگیری، بخش‌هایی را که پاسخشان اشتباه بود دوباره مرور کن.</p></div>`;
    $("#prevQuestion").classList.add("hidden");$("#nextQuestion").classList.add("hidden");$("#restartQuiz").classList.remove("hidden");
  }
  renderQuiz();
})();