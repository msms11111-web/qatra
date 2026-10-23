(() => {
  // مسار مجلد assets وجذر الموقع، مشتقان من مسار هذا الملف نفسه
  const SCRIPT_DIR = new URL(".", (document.currentScript && document.currentScript.src) || location.href);
  const SITE_ROOT = new URL("../", SCRIPT_DIR);

  /* تبديل الوضع الليلي. الاختيار المحفوظ يُطبَّق في رأس الصفحة قبل أول رسم،
     وهنا تُضبط الأيقونة ويُتابَع تغيّر تفضيل النظام ما لم يختر القارئ يدويًا. */
  const themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    const icon = themeBtn.querySelector("[data-theme-icon]");
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = () => {
      try {
        return localStorage.getItem("qatra-theme");
      } catch (e) {
        return null;
      }
    };
    const isDark = () => (stored() || (system.matches ? "dark" : "light")) === "dark";
    const paint = () => {
      const dark = isDark();
      if (icon) icon.textContent = dark ? "☀" : "☾";
      themeBtn.setAttribute("aria-pressed", String(dark));
      themeBtn.title = dark ? "التحويل إلى الوضع النهاري" : "التحويل إلى الوضع الليلي";
    };
    themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("qatra-theme", next);
      } catch (e) {}
      paint();
    });
    system.addEventListener("change", () => {
      if (!stored()) paint();
    });
    paint();
  }

  // القائمة الجانبية على الشاشات الصغيرة
  const menuBtn = document.querySelector("[data-menu]");
  const drawer = document.querySelector("[data-drawer]");
  if (menuBtn && drawer) {
    const setOpen = (open) => {
      drawer.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* الحروف اللاتينية المعجَمة تُردّ إلى أصلها، حرفًا بحرف لا بتطبيع يونيكود،
     لتبقى خريطة المواضع واحدًا بواحد. بدون هذا لا يجد من كتب «cenicafe»
     صفحةً تكتب «Cenicafé»، وهو نفس عيب الهمزة في العربية. */
  const LATIN = {
    á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a",
    é: "e", è: "e", ê: "e", ë: "e",
    í: "i", ì: "i", î: "i", ï: "i",
    ó: "o", ò: "o", ô: "o", ö: "o", õ: "o",
    ú: "u", ù: "u", û: "u", ü: "u",
    ñ: "n", ç: "c", ý: "y",
  };

  /* تطبيع النص العربي مع خريطة مواضع.
     التشكيل والتطويل يُحذفان، فيتغير طول النص. بدون الخريطة تنزلق مواضع
     التعليم على النص الأصلي، ويُعلَّم حرف غير الذي طابق. */
  const fold = (input) => {
    const source = input || "";
    let text = "";
    const map = [];
    for (let i = 0; i < source.length; i++) {
      let c = source[i].toLowerCase();
      if (/[ً-ْـ]/.test(c)) continue;
      if (LATIN[c]) c = LATIN[c];
      else if (/[أإآٱ]/.test(c)) c = "ا";
      else if (c === "ى") c = "ي";
      else if (c === "ة") c = "ه";
      else if (/[ؤئ]/.test(c)) c = "ء";
      else if (/\s/.test(c)) {
        if (!text || text.endsWith(" ")) continue;
        c = " ";
      } else {
        // الأرقام العربية والفارسية تُوحَّد، ليجد «٢١٠٠» النص المكتوب «2100»
        const d = "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹".indexOf(c);
        if (d >= 0) c = String(d % 10);
      }
      text += c;
      map.push(i);
    }
    return { text, map };
  };

  const normalize = (s) => fold(s).text.trim();

  /* أسماء تُكتب بالرسمين: المصادر لاتينية والقارئ يكتب بالعربية.
     بدون هذا لا تجد «يونسكو» صفحةً تكتبها UNESCO. */
  const ALIASES = [
    ["يونسكو", "unesco"],
    ["هاريو", "hario"],
    ["كوستاريكا", "costa"],
    ["كانتون", "canton"],
    ["حافره", "broca"],
    ["المخا", "mocha", "mokha"],
    ["تهامه", "tihama"],
    ["سورت", "surat"],
    ["مسقط", "muscat"],
    ["اثيوبيا", "ethiopia"],
    ["قوجي", "guji"],
    ["ديجا", "ديغا", "dega", "deiga"],
    ["ارابيكا", "arabica"],
    ["جازان", "jazan", "jizan"],
    ["خولاني", "khawlani"],
    ["الدائر", "aldayer"],
    ["فيفاء", "faifa"],
    ["تقشير", "hulling"],
    ["سند", "lineage", "provenance"],
    ["جما", "jimma", "jma"],
    ["اوروميا", "oromia"],
    ["البرازيل", "برازيل", "brazil", "brasil"],
    ["كولومبيا", "colombia"],
    ["كينيا", "kenya"],
    ["اندونيسيا", "indonesia"],
    ["سومطرة", "سماترا", "sumatra"],
    ["كاستيو", "castillo"],
    ["كاتورا", "caturra"],
    ["باتيان", "batian"],
    ["رويرو", "ruiru"],
    ["كونيلون", "conilon"],
    ["الكافيين", "كافيين", "caffeine"],
    ["هيميليا", "hemileia", "vastatrix"],
    ["انثراكنوز", "anthracnose"],
    ["سيلان", "سريلانكا", "ceylon"],
    ["تيمور", "timor"],
    ["قلوية", "alkalinity"],
    ["صلادة", "hardness"],
    ["اكسدة", "تاكسد", "oxidation"],
    ["تقادم", "staling"],
    ["فيتنام", "vietnam"],
    ["كاتيمور", "catimor"],
    ["سارشيمور", "sarchimor"],
    ["روبوستا", "robusta"],
    ["بنما", "panama"],
    ["بوكيتي", "boquete"],
    ["بورصة", "exchange", "ice"],
    ["منظمه", "organization", "ico"],
    ["اتفاق", "agreement", "ica"],
    ["غابات", "deforestation", "eudr"],
    ["احداثيات", "geolocation"],
    ["عنايه", "diligence"],
    ["كانيفورا", "canephora"],
    ["تيبيكا", "typica"],
    ["بوربون", "bourbon"],
    ["اليمن", "يمن", "yemen"],
    ["ميناس", "minas"],
    ["جيرايس", "gerais"],
    ["سينيكافي", "cenicafe"],
    ["الاسبريسو", "اسبريسو", "espresso"],
    ["تحميص", "roasting"],
    ["تقييم", "evaluation", "assessment"],
    ["وصفي", "descriptive"],
    ["ميلانويدينات", "melanoidins", "melanoidin"],
    ["ميلارد", "maillard"],
    ["عيوب", "عيب", "defects", "defect"],
    ["تصنيف", "grading"],
    ["انطباعي", "affective"],
    ["خارجي", "extrinsic"],
    ["تسميه", "naming"],
    /* «هَرار» مدينةٌ وسلالةٌ إثيوبية، و«الهرري» نسبةٌ إليها. فالصيغتان العربيتان
       كلتاهما في المجموعة، وإلا لم تجد «harar» صفحةَ رواندا التي تكتب «هَرار». */
    ["هرري", "هرار", "harari", "harar"],
    ["عسير", "asir"],
    ["الباحه", "باحه", "baha"],
    ["سعوديبيديا", "saudipedia"],
    ["تحكيم", "cupping"],
    ["ماء", "water"],
    ["استخلاص", "extraction"],
    ["تخزين", "storage"],
    ["تجفيف", "drying"],
    ["اوكراتوكسين", "ochratoxin"],
    ["قيمه", "value"],
    ["توزيع", "distribution"],
    ["سعر", "price"],
    ["فروق", "فرق", "differentials", "differential"],
    ["كولد", "cold"],
    ["كافستول", "cafestol"],
    ["كاهويول", "kahweol"],
    ["دايتربينات", "diterpenes", "diterpene"],
    ["كوستاريكا", "costa", "rica"],
    ["غواتيمالا", "guatemala"],
    ["هندوراس", "honduras"],
    ["ليمبيرا", "lempira"],
    ["بارانيما", "parainema"],
    ["اوغندا", "uganda"],
    ["رواندا", "rwanda"],
    ["بيرازين", "pyrazine", "ipmp"],
    ["انتستيا", "antestia"],
    ["بطاطس", "potato"],
    ["ممطوره", "monsooned", "monsoon"],
    ["مالابار", "malabar"],
    ["مانغالور", "mangalore"],
    ["هرار", "harar"],
    ["طحن", "grinding", "grind"],
    ["نواعم", "fines"],
    ["اقراص", "burrs", "burr"],
    ["اناكافي", "anacafe"],
    /* «هند» وحدها بادئةُ «هندوراس»، فمكافأتها بـindia تجعل البحث عن india
       يتصدّر بهندوراس لا بالهند. والكلمة الكاملة وحدها تُكافأ. */
    ["الهند", "india"],
    ["كنت", "kent"],
    ["كورج", "coorg"],
    ["كارناتاكا", "karnataka"],
    ["ميسور", "mysore"],
    ["كاتواي", "catuai"],
    ["اوباتا", "obata"],
    ["سنتروامريكانو", "centroamericano"],
    ["مكبس", "press", "cafetiere"],
    ["نقع", "brew", "immersion"],
    ["احماض", "حمض", "acids", "acid"],
    ["ستريك", "citric"],
    ["كينيك", "quinic"],
    ["ماليك", "malic"],
    ["اسيتيك", "acetic"],
    ["كلوروجينيك", "chlorogenic", "cga"],
    ["فيرتريد", "فيرترايد", "fairtrade"],
    ["عضوي", "عضوية", "organic"],
    ["رينفورست", "rainforest"],
    ["شهادة", "شهادات", "توثيق", "certification", "certifications"],
    ["عجلة", "wheel"],
    ["معجم", "lexicon"],
    ["حسي", "حسية", "sensory"],
    ["هجين", "هجائن", "hybrid", "hybrids"],
    ["ستارمايا", "starmaya"],
    ["مارسيليسا", "marsellesa"],
    ["عقم", "sterility", "sterile"],
    ["روميه", "rume"],
    ["اكثار", "propagation"],
    ["غاز", "degassing", "co2"],
    ["كريما", "crema"],
    ["لانغمير", "langmuir"],
    ["طزاجة", "freshness"],
    ["بورصة", "ice"],
    ["اجل", "futures"],
    ["مصدق", "certified"],
    ["مخزون", "stocks", "stock"],
    ["تخمير", "fermentation", "fermented"],
    ["بكتين", "pectin"],
    ["خميره", "خمائر", "yeast", "yeasts"],
    ["لبن", "lactic"],
    ["ليبيريكا", "liberica"],
    ["اكسيلسا", "excelsa", "dewevrei"],
    ["ليبيرويديه", "libericoid"],
    ["كيو", "kew"],
    ["مواصفه", "مواصفات", "standard", "standards", "gso"],
    ["لائحه", "regulation"],
    ["تقييس", "standardization"],
    ["طيار", "طيارة", "volatile", "volatiles"],
    ["رائحه", "aroma", "odour", "odor"],
    ["استشمام", "olfactometry", "olfactometric"],
    ["فورفورال", "furfural"],
    ["غواياكول", "guaiacol"],
    ["فورانيول", "furaneol"],
    ["استهلاك", "consumption"],
    ["انتاج", "production"],
    ["كيس", "bag", "bags"],
    ["بيرو", "peru", "peruano"],
    ["المكسيك", "مكسيك", "mexico"],
    ["تشياباس", "chiapas"],
    ["فيراكروس", "veracruz"],
    ["اواخاكا", "oaxaca"],
    ["كواتيبيك", "coatepec"],
    ["تسميه", "تسميات", "denominacion", "appellation"],
    ["كسكره", "cascara", "husk"],
    ["قشر", "قشور"],
    ["نقيع", "infusion"],
    // الصيغةُ المجرّدة «طن» محذوفةٌ قصدًا: الواوُ بادئةٌ مسموحة واللاحقةُ «يا»
    // مقبولة، فتُطابِق «وَطَنيًّا» و«وطنية» — وقد تصدّرت بها صفحةُ بيرو طلبَ
    // «عشرة أطنان». وهذا نظيرُ «هند» التي كانت تُطابِق «هندوراس».
    ["اطنان", "tonne", "tonnes"],
    ["جوت", "jute"],
    ["درجه", "grade", "class"],
    // «ذوبان» خاصيةٌ فيزيائية و«instant/soluble/فورية» اسمُ منتج، وكانا في
    // مجموعةٍ واحدة. فتصدَّرت صفحةُ الأكريلاميد طلبَ «قهوة فورية» لأن فيها
    // «شديدُ الذوبان في الماء». فصُلت المجموعتان: اسمُ المنتج وحدَه يتكافأ،
    // و«ذوبان» تُطابِق نصَّها حيث وقعت بلا توسيع. وهذا نظيرُ «طن»/«وطنيًّا».
    ["فوريه", "soluble", "instant"],
    ["مستخلصات", "extracts"],
    ["شيكوريا", "chicory"],
    ["مدونه", "code"],
    ["تكافؤ", "equivalence"],
    ["استدامه", "sustainability"],
    ["توكيد", "assurance"],
    ["حكامه", "governance"],
    ["ستينوفيلا", "stenophylla"],
    ["مناخ", "مناخي", "climate"],
    ["ملاءمه", "suitability"],
    ["انبعاثات", "emissions"],
    ["صرف", "wastewater", "effluent"],
    ["رشيح", "leachate", "leachates"],
    ["تانك", "tina", "tank"],
    ["فرقعه", "crack", "cracking"],
    ["موكا", "moka"],
    ["نفاذيه", "permeability"],
    ["صحه", "صحية", "health"],
    ["سرطان", "cancer", "carcinogenic"],
    ["مريء", "esophageal", "oesophageal"],
    ["مظليه", "umbrella"],
    ["سببيه", "causation", "causal"],
    ["مندليه", "mendelian"],
    ["معشاه", "randomised", "randomized"],
    ["تاريخ", "history"],
    ["مخطوطه", "مخطوطة", "manuscript"],
    ["الجزيري", "jaziri", "jazari"],
    ["ساسي", "sacy"],
    ["كاسيري", "casiri"],
    ["الاسكوريال", "escurial", "escorial"],
    ["بدايات", "بداية", "beginnings"],
    ["الجزاير", "algeria"],
    ["الفلبين", "philippines"],
    ["مخزون", "مخزونات", "stocks"],
    ["كبسوله", "كبسولات", "capsule", "capsules"],
    ["اخماد", "quenching", "quench"],
    ["مميع", "fluidised", "fluidized"],
    ["كنودسن", "knudsen"],
    ["سلولوز", "cellulose"],
    ["بشره", "epidermis"],
    ["اكريلاميد", "acrylamide"],
    ["غليسيداميد", "glycidamide"],
    ["اسبراجين", "asparagine"],
    ["فانيغا", "fanega"],
    ["كابتشينو", "cappuccino"],
    ["لزوجه", "viscosity"],
    ["برشمان", "pergamino", "parchment"],
    ["قنطار", "quintal", "quintales"],
    ["مندهيلينغ", "mandheling"],
    ["بَراسان", "berasan"],
    ["اسالان", "asalan"],
    ["ميدان", "medan"],
    ["اندونيسيا", "indonesia"],
    ["غايو", "gayo"],
    ["توراجا", "toraja"],
    ["كوبي", "kopi"],
    ["تجميعي", "meta-analysis", "metaanalysis"],
    ["prisma", "برزما"],
    ["طراز", "genotype"],
    ["كرز", "cereza", "cherry"],
    ["بويبلا", "puebla"],
    ["اواخاكا", "oaxaca"],
    ["تشياباس", "chiapas"],
    ["فيراكروس", "veracruz"],
    ["سوكونوسكو", "soconusco"],
    ["انهيار", "avalanche"],
    ["صفائحي", "laminar"],
    ["هاريو", "hario"],
  ].map((group) => group.map(normalize));

  // «ال» التعريف في طلب الباحث: الفهرس يحمل «رطوبةٍ نسبيةٍ» منكَّرةً، ومن يكتب
  // «الرطوبة النسبية» كان لا يجد شيئًا — لأن قاعدة البادئة تسمح للنص أن يحمل
  // بادئةً لا للطلب. فتُضاف الصيغة المجرَّدة صيغةً مكافئة، ويُشترط بقاءُ ثلاثة
  // أحرف بعد الحذف كيلا تنقلب الكلمة إلى جذرٍ عامّ. والصيغتان معًا، فلا يَضيع
  // من كتب «ال» ولا من تركها.
  const bare = (word) => {
    const m = /^[وفبكل]{0,2}ال(.{3,})$/.exec(word);
    return m ? m[1] : null;
  };

  // كل كلمة تتوسع إلى صيغها المكافئة، وتكفي واحدة منها للمطابقة
  const expand = (word) => {
    for (const group of ALIASES) if (group.includes(word)) return group;
    return [word];
  };

  // توسيعٌ احتياطيٌّ لا يُستعمل إلا حين يَخلو البحث من نتيجة: تُضاف الصيغةُ
  // المجرَّدة من «ال». وجُعل احتياطيًّا لا أصليًّا لأن إضافتَه إلى كل طلبٍ
  // أزاحت ترتيبَين صحيحين — «الدرجة المختصة» و«العيب الكامل» — حين صارت
  // «درجة» و«عيب» تُطابقان صفحاتٍ أعمَّ. فالدقّةُ أولًا، والسَّعَةُ عند العجز.
  const expandBare = (word) => {
    const group = expand(word);
    const b = bare(word);
    return b && !group.includes(b) ? group.concat([b]) : group;
  };

  const terms = (s) => normalize(s).split(" ").filter(Boolean);

  const escape = (s) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // مواضع كل مطابقة على النص الأصلي، مرتبة وغير متداخلة
  const spans = (text, words) => {
    const f = fold(text);
    const found = [];
    words.forEach((w) => {
      for (let i = f.text.indexOf(w); i >= 0; i = f.text.indexOf(w, i + w.length)) {
        found.push([f.map[i], f.map[i + w.length - 1] + 1]);
      }
    });
    found.sort((a, b) => a[0] - b[0]);
    return found.filter((s, i) => i === 0 || s[0] >= found[i - 1][1]);
  };

  const highlight = (text, words, from, to) => {
    let out = "";
    let cursor = from;
    for (const [s, e] of spans(text, words)) {
      if (e <= from || s >= to || s < cursor) continue;
      out += escape(text.slice(cursor, s)) + "<mark>" + escape(text.slice(s, e)) + "</mark>";
      cursor = e;
    }
    return out + escape(text.slice(cursor, to));
  };

  // مقتطف حول أول مطابقة، مع تعليم كل المطابقات داخل النافذة
  const excerpt = (text, words) => {
    const hit = spans(text, words)[0];
    const start = hit ? Math.max(0, hit[0] - 60) : 0;
    const end = Math.min(text.length, (hit ? hit[0] : 0) + 150);
    return (
      (start > 0 ? "…" : "") + highlight(text, words, start, end) + (end < text.length ? "…" : "")
    );
  };

  /* تمييز العدد في العربية: مفردٌ للواحد، مثنًّى للاثنين، جمعٌ من ثلاثة إلى
     عشرة، ثم مفردٌ منصوب فيما فوقها. و«8 نتيجة» خطأ يراه كل قارئ عربي. */
  const counted = (n, one, two, few, many) =>
    n === 1 ? one : n === 2 ? two : n <= 10 ? n + " " + few : n + " " + many;

  const entriesLabel = (n) =>
    counted(n, "مدخل واحد", "مدخلان", "مداخل", "مدخلًا");
  const hitsLabel = (n) =>
    counted(n, "نتيجة واحدة", "نتيجتان", "نتائج", "نتيجة");

  const search = document.querySelector("[data-search]");
  if (search) initSearch(search);

  function initSearch(input) {
    const entities = [...document.querySelectorAll("[data-entity]")];
    const grid = document.querySelector(".entities");
    const panel = document.querySelector("[data-results]");
    const count = document.querySelector("[data-count]");
    const empty = document.querySelector("[data-empty]");

    // فهرس نص كل الصفحات، يُبنى وقت النشر. لو تعذّر تحميله يعمل البحث على البطاقات.
    let index = null;

    /* مطابقة الأجزاء وحدها تخلط كلمات لا علاقة بينها: «دلة» تُطبَّع «دله»
       وهي جزء من «أدلة». فتُرصد بداية الكلمة، ويُعدّ «ال» التعريف حدًّا،
       لتبقى «مجففة» تجد «المجففة». */
    // السوابق المتصلة في العربية تتراكم: و + ال + الكلمة («والدلة»)، ف/ب/ك/ل كذلك
    const PREFIX = /^[وفبكل]{0,2}(ال)?$/;

    /* حدّ الكلمة ليس المسافة وحدها: «(TDS)» و«AA» ترد ملتصقة بترقيم، وقياس
       البداية إلى آخر مسافة يجعل السابقة «(» فتُرفض الكلمة القصيرة كلها. */
    /* المدى ؀-ۿ يشمل ترقيمَ العربية: الفاصلة ، والفاصلةَ المنقوطة ؛ وعلامةَ
       الاستفهام ؟ والنقطةَ ۔. فعدُّها حروفَ كلمةٍ يجعل «476،» كلمةً واحدة،
       فتُرفض مطابقةُ «476» بشرط اللاحقة. فالمدى هنا حروفٌ وأرقامٌ لا ترقيم. */
    const WORDCH = /[0-9a-z\u0621-\u064a\u0660-\u0669\u0671-\u06d3]/;

    /* كلمةٌ قصيرة قد تكون بادئةَ جذرٍ آخر لا صيغةً منها: «جما» بادئةُ
       «جماعي»، و«يمن» بادئةُ «يمنع»، و«هند» بادئةُ «هندوراس». فكان البحث عن
       «jimma» يتصدّر بصفحة الشهادات لأن فيها «قرارٍ جماعي».

       والحلّ ألا يُقبل بعد الكلمة القصيرة إلا لاحقةُ إعرابٍ أو نسبة، لا حروفُ
       جذرٍ جديد. فتبقى «حسي» تجد «حسيًّا»، و«سعر» تجد «سعرًا»، ولا تجد «جما»
       «جماعي». ويُقصر هذا على القصير، لأن الطويل يكفي تخصيصًا بنفسه. */
    const TAIL = /^(ا|ه|ي|ن|ت|ات|ان|ين|ون|يه|يا|ها|هم|نا|s)?$/;

    const NUMONLY = /^[0-9\u0660-\u0669]+$/;
    const NUMSEP = /[,.\u066b\u066c\u060c]/;

    const findIn = (hay, w) => {
      let any = false;
      const short = w.length <= 3;
      for (let i = hay.indexOf(w); i >= 0; i = hay.indexOf(w, i + 1)) {
        any = true;
        let start = i;
        while (start > 0 && WORDCH.test(hay[start - 1])) start--;
        if (!PREFIX.test(hay.slice(start, i))) continue;
        /* مقطعٌ من عددٍ ليس عددًا: «982» تَرِد في «85,982» وفاصلةُ الآلاف
           ليست حرفًا، فكان الموضعُ يُحسَب بدايةَ كلمة — وهو بدايةُ مقطعٍ
           لا بدايةُ رقم. فتصدَّرت المكسيكُ طلبَ «982» على صفحة ماء
           المعالجة، وفيها «982 لترًا لكل طنّ». فيُرفَض الرقمُ الخالصُ إذا
           سبقته فاصلةٌ سبقها رقم. وهذا نظيرُ «طن»/«وطنيًّا». */
        if (NUMONLY.test(w) && i > 1 && NUMSEP.test(hay[i - 1]) &&
            NUMONLY.test(hay[i - 2])) continue;
        if (short) {
          let end = i + w.length;
          while (end < hay.length && WORDCH.test(hay[end])) end++;
          if (!TAIL.test(hay.slice(i + w.length, end))) continue;
        }
        return { any: true, atWord: true };
      }
      return { any, atWord: false };
    };

    const FIELDS = [["title", 6], ["headings", 3], ["desc", 2], ["text", 1]];

    const score = (page, groups) => {
      let total = 0;
      for (const group of groups) {
        // تكفي صيغة واحدة من صيغ الكلمة، لكن كل كلمة مطلوبة
        let best = 0;
        for (const w of group) {
          // الكلمات القصيرة تُقبل عند بداية كلمة فقط، وإلا امتلأت النتائج بمطابقات عابرة
          const needWord = w.length <= 3;
          let sum = 0;
          for (const [field, weight] of FIELDS) {
            const r = findIn(page.n[field], w);
            if (!r.any || (needWord && !r.atWord)) continue;
            sum += weight * (r.atWord ? 2 : 1);
          }
          if (sum > best) best = sum;
        }
        if (!best) return 0; // لا صيغة من هذه الكلمة موجودة
        total += best;
      }
      // الرئيسية وفهرس الموسوعة يلمّحان إلى كل شيء فيتصدّران كل بحث: الأولى
      // صفحة هبوط، والثاني يَجمع كلماتِ كل بطاقة فيُطابق ما يُطابقه أيُّ مدخل.
      // وكلاهما دليلٌ لا جواب. وقد تصدّر الفهرسُ طلبَ «مخطوطة» على الصفحة التي
      // تحمل المخطوطة نفسَها، فعُومل معاملةَ الرئيسية.
      const DIRECTORY = ["", "encyclopedia/"];
      return DIRECTORY.includes(page.url) ? total * 0.45 : total;
    };

    const showBrowse = () => {
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
      }
      if (grid) grid.hidden = false;
      entities.forEach((el) => (el.hidden = false));
      if (count) count.textContent = entriesLabel(entities.length);
      if (empty) empty.hidden = true;
    };

    const renderResults = (groups) => {
      const words = groups.flat(); // التعليم يشمل كل الصيغ، فتُبرز الصيغة الموجودة فعلًا
      const hits = index
        .map((page) => ({ page, s: score(page, groups) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);

      if (grid) grid.hidden = true;
      panel.hidden = false;
      panel.innerHTML = hits
        .map(
          ({ page }) =>
            `<a class="result" href="${escape(page.href)}">` +
            `<h3>${highlight(page.title, words, 0, page.title.length)}</h3>` +
            `<p>${excerpt(page.text || page.desc, words)}</p></a>`
        )
        .join("");

      if (count) count.textContent = hitsLabel(hits.length);
      if (empty) empty.hidden = hits.length > 0;
    };

    const filterCards = (words) => {
      let hits = 0;
      entities.forEach((el) => {
        const hay = normalize((el.dataset.entity || "") + " " + el.textContent);
        const match = words.every((w) => hay.includes(w));
        el.hidden = !match;
        if (match) hits++;
      });
      if (count) count.textContent = hitsLabel(hits);
      if (empty) empty.hidden = hits > 0;
    };

    const run = () => {
      const words = terms(input.value);
      if (!words.length) return showBrowse();
      if (index && panel) {
        const groups = words.map(expand);
        const any = index.some((page) => score(page, groups) > 0);
        renderResults(any ? groups : words.map(expandBare));
      } else filterCards(words);
    };

    const q = new URLSearchParams(location.search).get("q");
    if (q) input.value = q;
    input.addEventListener("input", run);
    const btn = input.parentElement && input.parentElement.querySelector("button");
    if (btn)
      btn.addEventListener("click", () => {
        input.focus();
        run();
      });
    run();

    fetch(new URL("search-index.json", SCRIPT_DIR))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!Array.isArray(data)) return;
        index = data.map((p) => ({
          ...p,
          href: new URL(p.url, SITE_ROOT).href,
          n: {
            title: normalize(p.title),
            desc: normalize(p.desc),
            headings: normalize((p.headings || []).join(" ")),
            text: normalize(p.text),
          },
        }));
        run();
      })
      .catch(() => {});
  }

  // ظهور تدريجي للعناصر عند التمرير
  const faders = document.querySelectorAll(".fade");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.1 }
    );
    faders.forEach((x) => io.observe(x));
  } else {
    faders.forEach((x) => x.classList.add("in"));
  }

  document.querySelectorAll("[data-year]").forEach((x) => {
    x.textContent = new Date().getFullYear();
  });

  /* مقاطع المدخل: ترقيم صريح، ومستويات قراءة، وموضع القارئ.
     كل ذلك يُضاف هنا لا في HTML المبني، فمن لا يشغّل السكربت يرى المدخل كاملًا
     مرقّمًا بعدّادات CSS، ويبقى استخراج extract.py دورةً مغلقة. */
  const article = document.querySelector(".layout > .article");
  const layout = article && article.parentElement;
  const side = layout && layout.querySelector(".side");
  const heads = article ? [...article.children].filter((el) => el.tagName === "H2" && el.id) : [];
  if (heads.length > 1) {
    const two = (n) => String(n).padStart(2, "0");
    // «المصادر» و«خيوط بحث» تُطوى في مستوى المتن؛ و«التصحيح» لا يُطوى أبدًا
    const SRC = new Set(["sources", "leads"]);
    const NEVER_FOLD = new Set(["corrected"]);
    const sideLink = (id) => side && side.querySelector(`a[href="#${CSS.escape(id)}"]`);
    const secs = heads.map((h, i) => ({
      h,
      id: h.id,
      n: two(i + 1),
      name: (sideLink(h.id) || h).textContent.trim(),
      src: SRC.has(h.id),
      fold: i > 0 && !NEVER_FOLD.has(h.id),
    }));

    // كل عنصر بين عنوانين يحمل علامات مقطعه، وتُخفيه قاعدة CSS بحسب المستوى
    let cur = null;
    for (const el of [...article.children]) {
      if (el.tagName === "H2" && el.id) cur = secs.find((s) => s.h === el);
      if (!cur || el.classList.contains("revnote")) continue;
      if (cur.src) el.dataset.src = "";
      if (cur.fold) el.dataset.fold = "";
    }
    secs.forEach((s) => {
      s.h.dataset.n = s.n;
      const a = sideLink(s.id);
      if (!a) return;
      a.dataset.n = s.n;
      if (s.src) a.dataset.src = "";
      if (s.fold) a.dataset.fold = "";
    });

    const nSrc = secs.filter((s) => s.src).length;
    const nFold = secs.filter((s) => s.fold).length;
    const LEVELS = [
      ["brief", "الخلاصة", "المقطع الأول وحده، ومعه أي تصحيح منشور. الباقي مطويّ ظاهرٌ عددُه."],
      ["text", "المتن", "المقاطع كلها، وقائمة المصادر مطويّة."],
      ["full", "المتن والمصادر", "المدخل كاملًا كما نُشر."],
    ].filter(([k]) => k !== "text" || nSrc);

    const read = () => {
      try {
        return localStorage.getItem("qatra-depth");
      } catch (e) {
        return null;
      }
    };
    const group = document.createElement("div");
    group.className = "depth";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "مستوى القراءة");
    const note = document.createElement("p");
    note.className = "depth-note";
    group.innerHTML = LEVELS.map(([k, label]) => `<button type="button" data-level="${k}">${label}</button>`).join("");
    article.prepend(group, note);

    // تنبيه في موضع ما طُوي: الطيّ لا يكون صامتًا
    const folded = (key, text, label, to) => {
      const box = document.createElement("div");
      box.className = "folded";
      box.dataset.for = key;
      box.innerHTML = `<p>${text}</p><button type="button">${label}</button>`;
      box.querySelector("button").addEventListener("click", () => set(to, true));
      return box;
    };
    const briefBox = folded(
      "brief",
      (nFold === 1 ? "طُوي مقطعٌ واحد" : nFold === 2 ? "طُوي مقطعان" : `طُويت ${nFold} ${nFold <= 10 ? "مقاطع" : "مقطعًا"}`) +
        "، وقد يكون فيها من الحدود والتحفّظات ما لا تُظهره الخلاصة.",
      "تابع القراءة",
      nSrc ? "text" : "full"
    );
    const firstFold = secs.find((s) => s.fold);
    if (firstFold) article.insertBefore(briefBox, firstFold.h);
    const srcSec = secs.find((s) => s.src);
    const srcBox = srcSec ? folded("text", "قائمة المصادر مطويّة، وهي في آخر المدخل.", "اعرض المصادر", "full") : null;
    if (srcBox) article.insertBefore(srcBox, srcSec.h);

    let level;
    function set(next, focus) {
      level = LEVELS.some(([k]) => k === next) ? next : "full";
      layout.dataset.depth = level;
      group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === level)));
      note.textContent = LEVELS.find(([k]) => k === level)[2];
      briefBox.hidden = level !== "brief" || !nFold;
      if (srcBox) srcBox.hidden = level !== "text";
      try {
        localStorage.setItem("qatra-depth", level);
      } catch (e) {}
      if (focus) group.querySelector(`[data-level="${level}"]`).focus();
      spy && spy.refresh();
    }
    group.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) set(b.dataset.level);
    });

    // رابطٌ إلى مقطعٍ مطويّ يفتح المدخل كاملًا قبل الانتقال
    const reveal = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const s = id && secs.find((x) => x.id === id);
      if (s && ((level === "brief" && s.fold) || (level === "text" && s.src))) {
        set("full");
        s.h.scrollIntoView();
      }
    };

    // موضع القارئ: العنوان الأخير الذي تجاوز ثلث الشاشة
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "secpill";
    pill.setAttribute("aria-haspopup", "dialog");
    pill.innerHTML = '<span></span><small></small>';
    const sheet = document.createElement("div");
    sheet.className = "secsheet";
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="panel" role="dialog" aria-modal="true" aria-labelledby="secsheet-h">' +
      '<div class="bar"><h2 id="secsheet-h">مقاطع المدخل</h2>' +
      '<button type="button" class="close" aria-label="إغلاق">×</button></div><ol></ol></div>';
    document.body.append(pill, sheet);

    const visible = () => secs.filter((s) => s.h.offsetParent !== null);
    let current = secs[0];
    const paint = () => {
      const vis = visible();
      pill.querySelector("span").textContent = current.name;
      pill.querySelector("small").textContent = `${vis.indexOf(current) + 1} من ${vis.length}`;
      pill.setAttribute("aria-label", `المقطع الحالي: ${current.name}. افتح قائمة المقاطع`);
      secs.forEach((s) => {
        const a = sideLink(s.id);
        if (a) a.toggleAttribute("aria-current", s === current);
      });
    };
    const spy = {
      refresh() {
        const line = innerHeight / 3;
        const vis = visible();
        current = vis.filter((s) => s.h.getBoundingClientRect().top <= line).pop() || vis[0] || secs[0];
        const r = article.getBoundingClientRect();
        pill.hidden = r.top > innerHeight * 0.6 || r.bottom < innerHeight * 0.4;
        paint();
      },
    };
    let ticking = false;
    addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          spy.refresh();
        });
      },
      { passive: true }
    );
    addEventListener("resize", () => spy.refresh());

    const list = sheet.querySelector("ol");
    const closeSheet = () => {
      sheet.hidden = true;
      pill.focus();
    };
    pill.addEventListener("click", () => {
      list.innerHTML = visible()
        .map(
          (s) =>
            `<li><a href="#${s.id}"${s === current ? ' aria-current="true"' : ""}>` +
            `<span class="n" aria-hidden="true">${s.n}</span><span>${s.name}</span></a></li>`
        )
        .join("");
      sheet.hidden = false;
      sheet.querySelector(".close").focus();
    });
    sheet.querySelector(".close").addEventListener("click", closeSheet);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) closeSheet();
      if (e.target.closest("a")) sheet.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheet.hidden) closeSheet();
    });

    set(read() || "full");
    reveal();
    addEventListener("hashchange", reveal);
  }
})();
