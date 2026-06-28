// Application State variables
let chatLogs = [];        // Parsed chat records: [{ date, nickname, timeStr, type, content, isMedia, timestamp }]
let activeUsers = {};     // Aggregated user details: { nickname: { ... } }
let masterUsers = {};     // Master participant records (entire room history)
let purgedGhosts = new Set();  // Nicknames of purged ghost members
let totalStats = {};      // Overall room statistics
let charts = {};          // Chart.js instances
let rawChatText = '';     // Uploaded or demo text content
let sortDirection = {};   // Track table sorting direction
let detectedPlatform = 'unknown'; // Currently detected platform
let absoluteStartDate = '-';      // Absolute first date in the raw chat log
let cachedAllLogsRaw = [];         // Cached copy of completely parsed unfiltered log file
let loadingTimerInterval = null;  // Loading modal timer interval
let loadingStartTime = 0;         // Loading modal timer start timestamp

// UI Filter and Toggle states
let hideLeavers = false;
let protectReentrants = false; // Protect re-entrants from being counted as leavers
let activeTab = 'tab-users';
let excludeEmojis = false; // Emoticon filter state
let chartSharePercent = 10; // Adjustable percentage for top/bottom chat share chart

// Dynamic Taxonomy (Category & Tag) System
let TAXONOMY = [];

function getFallbackTaxonomy() {
  return [
    { id:'MEDIA_NEWS',       label:'미디어/뉴스',    color:'#58a6ff',
      subs: [
        { id:'DAILY_NEWSPAPER',  label:'일간지',       tags:['조선일보','중앙일보','동아일보','한겨레','경향신문','한국일보','국민일보','서울신문','세계일보','문화일보'] },
        { id:'ECONOMIC_NEWSPAPER',label:'경제지',      tags:['한국경제','매일경제','머니투데이','이데일리','아시아경제','헤럴드경제','파이낸셜뉴스','서울경제','이코노미스트'] },
        { id:'WEEKLY_MAGAZINE',  label:'주간지',       tags:['시사IN','주간조선','주간동아','주간경향','한겨레21','뉴스위크코리아','시사저널'] },
        { id:'MONTHLY_MAGAZINE', label:'월간지',       tags:['신동아','월간조선','월간중앙','샘터','뿌리깊은나무'] },
        { id:'BROADCAST_NEWS',   label:'방송뉴스',     tags:['KBS','MBC','SBS','JTBC','TV조선','채널A','MBN','YTN','연합뉴스TV'] },
        { id:'ONLINE_NEWS',      label:'온라인뉴스/포털',tags:['네이버뉴스','다음뉴스','카카오뉴스','유튜브뉴스','뉴스레터','해외언론','BBC','CNN','NYT'] },
      ]
    },
    { id:'ECONOMY_INVEST',   label:'경제/투자',     color:'#3fb950',
      subs: [
        { id:'MACRO_ECONOMY', label:'경제일반',  tags:['금리','환율','물가','인플레이션','GDP','무역','수출','수입','경기침체','재정정책','통화정책','한국은행','연준','달러','엔화','위안화'] },
        { id:'STOCK_MARKET',  label:'주식',      tags:['코스피','코스닥','나스닥','NYSE','S&P500','개별종목','공매도','ETF','ELS','테마주','배당주','성장주','가치주','차트분석','기술적분석','기본분석','공시','실적','PER','PBR','ROE','외국인매매','기관매매'] },
        { id:'REAL_ESTATE',   label:'부동산',    tags:['아파트','분양','재건축','재개발','청약','전세','월세','갭투자','경매','공시지가','취득세','양도세','임대사업자','토지','상가','오피스텔','빌딩','GTX','개발호재','규제','LTV','DSR','강남','서울','수도권','지방'] },
        { id:'ALTERNATIVE_INVEST',label:'대체투자/기타',tags:['암호화폐','비트코인','이더리움','금','원자재','원유','채권','사모펀드','VC','스타트업투자','해외주식','미국주식','일본주식','중국주식'] },
        { id:'TAX_FINANCE',   label:'세금/재무', tags:['종합소득세','양도소득세','법인세','절세','세무사','회계사','법인설립','금융소득','건강보험료','피부양자','절세전략','증여','상속'] },
      ]
    },
    { id:'MEDICAL',          label:'의학/의료',     color:'#f0883e',
      subs: [
        { id:'MEDICAL_NEWS',    label:'의학뉴스/정책',  tags:['건강보험','급여','비급여','의료법','의정갈등','의사파업','전공의','의대정원','심평원','복지부','식약처','의료사고','판례','의료분쟁','의협','학회지침','가이드라인','임상시험','신약허가'] },
        { id:'CLINICAL_MEDICINE',label:'임상의학',       tags:['내과','외과','피부과','가정의학과','신경과','정형외과','산부인과','소아과','안과','이비인후과','비뇨기과','정신건강의학과','진단검사','영상의학','병리','응급의학'] },
        { id:'AESTHETICS_MEDICINE',label:'미용의학 (총괄)',tags:['미용시술','피부미용','안티에이징','체형관리','성형','비수술적시술','자연스러운결과','시술후관리'] },
        { id:'BOTOX_FILLER',    label:'보톡스/필러',    tags:['보톡스','보툴리눔독소','앨러간','메디톡스','휴젤','대웅','이노톡스','코어톡스','나보타','주름개선','사각턱','종아리','팔자주름','히알루론산필러','레스틸렌','쥬비덤','테아솔','벨라스트','이브아르','볼루마','노화개선','코필러','입술필러','턱필러'] },
        { id:'LASER',           label:'레이저/에너지장비', tags:['레이저','피코레이저','롱펄스','엔디야그','CO2레이저','어븀야그','IPL','RF','HIFU','울쎄라','슈링크','써마지','인모드','포텐자','피코웨이','피코슈어','스타워커','시네론','선드라','클라리티','아포지','아이콘','레이저토닝','색소치료','혈관치료','제모','여드름치료'] },
        { id:'LIFTING',         label:'리프팅',         tags:['실리프팅','실','PDO실','PCL실','PLLA실','콘실','스피큘','노블실','민트리프트','해피리프트','울트라리프팅','V리프팅','조직리프팅','페이스리프팅','넥리프팅','안검하수','눈꺼풀리프팅'] },
        { id:'PETIT_SURGERY',   label:'쁘띠성형',       tags:['쌍꺼풀','눈매교정','코필러','코수술','지방분해주사','윤곽주사','물광주사','엑소좀','줄기세포','태반주사','PRP','콜라겐주사','연어주사','MTS','더마롤러','마이크로니들링'] },
        { id:'BODY_SLIMMING',   label:'체형/비만',      tags:['지방흡입','지방분해','울트라셀','쿨스컬프팅','벨라쉐이프','바디FX','비만치료','비만약','삭센다','위고비','마운자로','체중감량'] },
        { id:'SKINCARE',        label:'피부관리',        tags:['보습','미백','여드름','흉터','모공','민감성','아토피','건선','색소침착','기미','잡티','홍조','주사','피부과학'] },
        { id:'DRUGS',           label:'약품/처방',       tags:['전문의약품','일반의약품','항생제','항염증제','스테로이드','진통제','수면제','항우울제','마약류관리','처방전','DUR','약물상호작용','신약','제네릭','바이오시밀러'] },
        { id:'CANCER_SCREENING',label:'암검진',          tags:['5대암검진','위암','대장암','간암','유방암','자궁경부암','국가암검진','내시경','조직검사','종양표지자','영상검사'] },
      ]
    },
    { id:'CLINIC_MANAGEMENT',label:'의원경영',      color:'#d2a8ff',
      subs: [
        { id:'SEMINAR_CONFERENCE',label:'세미나/학술대회',tags:['세미나','워크숍','학술대회','연수교육','CME','라이브서저리','케이스발표','포스터발표','초청강연','해외학회','국내학회','IMCAS','AMWC','AACS','KSAS','대한피부과학회','대한의사협회','온라인세미나','웨비나'] },
        { id:'EQUIPMENT_SUPPLY',label:'장비/재료수급',  tags:['의료기기','신규장비','장비구매','장비리스','장비임대','소모품','재료비','도매상','공급업체','AS','유지보수','국산장비','수입장비','인허가','FDA승인','CE인증','KFDA'] },
        { id:'PHARMA_SUPPLY',   label:'약품/도매',       tags:['도매상','약품공급','마진','거래처','약품가격','공동구매','리베이트','할인','미용재료','보톡스단가','필러단가','실단가'] },
        { id:'PRODUCT_INFO',  label:'제품정보/신제품', tags:['신제품출시','제품리뷰','비교분석','제품문의','사용후기','부작용보고','임상데이터','논문근거'] },
        { id:'CLINIC_OPS',    label:'의원운영',        tags:['직원채용','간호사','코디네이터','원무','급여','노무','근로계약','직원교육','고객응대','컴플레인','환자관리','예약시스템','EMR','의무기록','청구','심사','삭감','이의신청'] },
        { id:'MARKETING',     label:'마케팅/홍보',     tags:['네이버광고','카카오광고','SNS마케팅','인스타그램','유튜브채널','블로그','리뷰관리','강남언니','강남언니후기','바비톡','성형앱','광고비','ROI','이벤트','패키지상품'] },
        { id:'LEGAL_COMPLIANCE',label:'법무/컴플라이언스',tags:['의료법위반','광고심의','개인정보보호','HIPAA','진료거부','의료사고','의료분쟁조정','손해배상','형사고소','민사소송','보험청구사기','감사원','세무조사'] },
        { id:'RATING_REVIEW',   label:'평점/리뷰',       tags:['네이버지도평점','카카오맵평점','구글리뷰','앱리뷰','악성리뷰','리뷰삭제','환자만족도','NPS','재방문율'] },
      ]
    },
    { id:'ENTERTAINMENT',    label:'엔터테인먼트/문화', color:'#ff7b72',
      subs: [
        { id:'VIDEO',    label:'동영상',   tags:['유튜브','릴스','틱톡','쇼츠','넷플릭스','왓챠','웨이브','드라마','영화','다큐멘터리','예능','스포츠중계','라이브방송','하이라이트'] },
        { id:'MUSIC',    label:'음악',     tags:['K팝','팝','클래식','재즈','힙합','인디','OST','플레이리스트','콘서트','페스티벌','유튜브뮤직','스포티파이','멜론'] },
        { id:'SPORTS',   label:'스포츠',   tags:['야구','축구','농구','골프','테니스','수영','마라톤','KBO','EPL','MLB','NBA','국가대표','올림픽'] },
        { id:'TRAVEL',   label:'여행',     tags:['국내여행','해외여행','일본','유럽','미국','동남아','맛집','숙소','항공권','여행팁','골프여행','의사여행'] },
        { id:'FOOD_DINING',label:'음식/맛집', tags:['맛집추천','레스토랑','와인','위스키','사케','커피','카페','배달음식','요리','건강식'] },
      ]
    },
    { id:'SCIENCE_TECH',     label:'과학/기술',      color:'#79c0ff',
      subs: [
        { id:'SCIENCE',       label:'과학일반',    tags:['논문','연구결과','임상시험','의학저널','네이처','사이언스','란셋','NEJM','JAMA','물리학','화학','생물학','천문학','환경과학'] },
        { id:'AI_TECH',       label:'AI/인공지능', tags:['ChatGPT','Claude','Gemini','AI의료','AI진단','AI영상판독','AI챗봇','LLM','딥러닝','AI규제','AI윤리'] },
        { id:'DIGITAL_HEALTH',label:'디지털헬스',  tags:['원격진료','비대면진료','디지털헬스케어','웨어러블','스마트워치','혈당모니터링','앱기반치료','PHR','EMR발전'] },
        { id:'GADGET_IT',     label:'가전/IT',     tags:['스마트폰','아이폰','갤럭시','노트북','애플워치','태블릿','카메라','드론','앱추천','소프트웨어'] },
      ]
    },
    { id:'POLITICS_LEGAL',   label:'정치/정책/법조',  color:'#ff4a4a',
      subs: [
        { id:'GOVT_POLITICS',   label:'정치/정부',     tags:['대통령','윤석열','문재인','국회','국회의원','정부정책','정책','보건복지부','복지부','여당','야당','선거','총선','대선','지방선거','법안','국정감사','탄핵','개헌','행정명령','고시','시행령'] },
        { id:'LEGAL_SYSTEM',    label:'사법/법조',     tags:['검찰','검찰청','법원판결','판결','판례','선고','대법원','헌법재판소','헌재','가처분','기각','인용','검사','판사','변호사','법률대리인','기소','구속','수사','조사','법원','송치','형사고소','민사소송'] },
        { id:'MEDICAL_CONFLICT', label:'의정갈등/의료대란',tags:['의료대란','의료공백','의대증원','증원','전공의탄압','전공의복귀','복귀명령','업무개시명령','면허정지','면허취소','사직서','처벌','단속','벌금','의사파업','의정갈등','집단행동','총파업','수련병원','파업','고발','행정처분'] },
      ]
    },
    { id:'SOCIAL_ISSUES',    label:'사회/이슈',      color:'#a5d6ff',
      subs: [
        { id:'CRIME_INCIDENT',label:'범죄/사건사고', tags:['살인','강도','사기','의료사기','보험사기','음주운전','교통사고','화재','재난','자연재해','학교폭력','직장내괴롭힘'] },
        { id:'SOCIAL_WELFARE',label:'복지/사회',     tags:['저출생','고령화','연금','국민연금','건강보험','의료급여','복지정책','교육','주거','환경'] },
      ]
    },
    { id:'FILE_ATTACHMENT',  label:'파일/첨부',      color:'#ffa657',
      subs: [
        { id:'DOCUMENT_FILE',label:'문서파일',   tags:['PDF','PPT','PPTX','Word','HWP','Excel','가이드라인문서','논문파일','계약서','동의서','양식'] },
        { id:'IMAGE_FILE',  label:'이미지파일', tags:['JPG','PNG','사진공유','스크린샷','시술사진','비포애프터','사례사진','논문그림','인포그래픽'] },
        { id:'VIDEO_FILE',  label:'동영상파일', tags:['MP4','시술영상','강의영상','수술영상','라이브서저리녹화','교육영상'] },
        { id:'LINK_URL',    label:'링크/URL',   tags:['뉴스링크','논문링크','유튜브링크','쇼핑링크','이벤트링크','공지링크','SNS링크'] },
      ]
    },
    { id:'HUMOR_DAILY',      label:'유머/일상',      color:'#56d364',
      subs: [
        { id:'HUMOR',      label:'유머/밈',      tags:['개그','밈','짤방','패러디','블랙코미디','의사유머','병원유머','직업유머','시사풍자'] },
        { id:'DAILY_LIFE', label:'일상',          tags:['날씨','인사','안부','생일축하','기념일','경조사','가족','자녀교육','육아','취미','독서','건강관리','운동'] },
        { id:'MOTIVATION', label:'동기부여/철학', tags:['명언','자기계발','인생관','철학','종교','감사','위로','응원'] },
      ]
    },
    { id:'ETC',              label:'기타',           color:'#b3b3b3',
      subs: [
        { id:'UNCLASSIFIED',  label:'미분류',    tags:['기타','분류불가','스팸','광고','단순공유'] },
        { id:'GROUP_ADMIN',   label:'그룹관리',  tags:['공지','투표','일정조율','모임안내','회비','단체주문','참석여부'] },
      ]
    },
  ];
}

TAXONOMY = getFallbackTaxonomy();

function parseTaxonomyText(text) {
  const lines = text.split(/\r?\n/);
  const taxonomy = [];
  let currentCategory = null;
  let currentSubcategory = null;

  const CATEGORY_COLORS = {
    'MEDIA_NEWS': '#58a6ff',
    'ECONOMY_INVEST': '#3fb950',
    'MEDICAL': '#f0883e',
    'CLINIC_MANAGEMENT': '#d2a8ff',
    'CLINIC_MGMT': '#d2a8ff',
    'ENTERTAINMENT': '#ff7b72',
    'SCIENCE_TECH': '#79c0ff',
    'POLITICS_LEGAL': '#ff4a4a',
    'SOCIAL_ISSUES': '#a5d6ff',
    'FILE_ATTACHMENT': '#ffa657',
    'HUMOR_DAILY': '#56d364',
    'ETC': '#b3b3b3'
  };

  const FALLBACK_PALETTE = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#6366f1', 
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', 
    '#22c55e', '#84cc16', '#eab308', '#f97316'
  ];
  let colorIndex = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('CATEGORY:')) {
      const content = line.substring(9).trim();
      const parts = content.split('|');
      const id = parts[0].trim();
      const label = parts[1] ? parts[1].trim() : id;
      const color = CATEGORY_COLORS[id] || FALLBACK_PALETTE[colorIndex++ % FALLBACK_PALETTE.length];
      
      currentCategory = { id, label, color, subs: [] };
      taxonomy.push(currentCategory);
      currentSubcategory = null;
    } else if (line.startsWith('SUBCATEGORY:')) {
      if (!currentCategory) continue;
      const content = line.substring(12).trim();
      const parts = content.split('|');
      const id = parts[0].trim();
      const label = parts[1] ? parts[1].trim() : id;
      
      currentSubcategory = { id, label, tags: [] };
      currentCategory.subs.push(currentSubcategory);
    } else if (line.startsWith('TAGS:')) {
      if (!currentSubcategory) continue;
      const content = line.substring(5).trim();
      const tags = content.split(',').map(t => t.trim()).filter(Boolean);
      currentSubcategory.tags.push(...tags);
    }
  }

  return taxonomy;
}

async function loadTaxonomy() {
  try {
    const response = await fetch('Keywords/categories.txt');
    if (!response.ok) throw new Error('Failed to fetch categories.txt');
    const text = await response.text();
    TAXONOMY = parseTaxonomyText(text);
    console.log('Successfully loaded dynamic taxonomy from categories.txt:', TAXONOMY);
    
    const verEl = document.getElementById('explorer-last-updated');
    if (verEl) {
      const match = text.match(/버전:\s*(\S+)/) || text.match(/v\d+\.\d+/);
      const version = match ? match[1] || match[0] : 'v1.0';
      verEl.textContent = `categories.txt ${version} · 태그 약 ${TAXONOMY.reduce((a,c)=>a+c.subs.reduce((s,su)=>s+su.tags.length,0),0)}개`;
    }
  } catch (e) {
    console.warn('Could not load categories.txt, using fallback static taxonomy.', e);
    TAXONOMY = getFallbackTaxonomy();
  }
}

function classifyMessage(text) {
  const lower = text.toLowerCase();
  
  let defaultCat = 'ETC';
  let defaultSub = 'UNCLASSIFIED';
  
  if (TAXONOMY.length > 0) {
    const lastCat = TAXONOMY.find(c => c.id === 'ETC') || TAXONOMY[TAXONOMY.length - 1];
    defaultCat = lastCat.id;
    const lastSub = lastCat.subs.find(s => s.id === 'UNCLASSIFIED') || lastCat.subs[0];
    defaultSub = lastSub ? lastSub.id : '';
  }

  let bestCat = defaultCat, bestSub = defaultSub, bestScore = 0;

  for (const cat of TAXONOMY) {
    for (const sub of cat.subs) {
      let score = 0;
      for (const tag of sub.tags) {
        if (lower.includes(tag.toLowerCase())) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCat = cat.id;
        bestSub = sub.id;
      }
    }
  }
  return { cat: bestCat, sub: bestSub, score: bestScore };
}

// Embedded Demo Data (KakaoTalk group chat log retrieved from workspace)
const DEFAULT_DEMO_DATA = `전미총 season2 님과 카카오톡 대화
저장한 날짜 : 2026-06-18 00:16:09

--------------- 2026년 6월 16일 화요일 ---------------
[엔트로피] [오전 8:08] 이모티콘
[통닥] [오전 8:18] 이모티콘
[성실의] [오전 8:22] 이모티콘
[피노르] [오전 8:30] 이모티콘
[어머나] [오전 8:33] 이모티콘
[시드마이어] [오전 8:42] 이모티콘
[로즈마리] [오전 8:45] 이모티콘
[아빠곰] [오전 8:58] 이모티콘
[코술코러] [오전 9:00] 이모티콘
[토리사시] [오전 9:05] 사진
[뚜비두또밥] [오전 9:19] https://n.news.naver.com/article/023/0003981647?sid=101
[무명씨] [오전 10:27] 걍 저 병원 원장 무사하길 ㅠ
[무명씨] [오전 10:27] 마약류 관리 잘 못 되면 요새 면허 취소 아닌가요 ㅠ
[커리] [오전 10:30] https://naver.me/xB7T3hhz
[커리] [오전 10:30] 2.5배 증가ㄷㄷ 엄청나네요
[커리] [오전 10:57] https://n.news.naver.com/article/029/0003031929
[화샤친] [오전 11:08] 이모티콘
[릴렉스] [오전 11:36] https://www.chosun.com/economy/tech_it/2026/06/15/DSKUKTHXEZBWPHVTI264TZ7SSM/
[안느] [오전 11:37] 메타에는 악재..?!
[Kobe] [오전 11:37] 우린 촉법부터 없애야...
[Kobe] [오전 11:39] 사진
[Kobe] [오전 11:39] 현실 리세마라 ㄷㄷㄷ
[Kobe] [오전 11:39] 전설 뽑을때까지!!
[안느] [오전 11:39] 미친ㅋㅋㅋㅋㅋ
[초심자] [오전 11:40] 저방법이있했네..
[커리] [오전 11:40] ㄷㄷ
[무명씨] [오전 11:43] 이러다 고등학교를 4년 5년 댕기고.. 대학 갈때 재수 삼수를 하고... 이러겠네요 ㅠ
[어느새흑자1] [오전 11:43] 이모티콘
[코술코러] [오전 11:48] 이모티콘
[touch] [오전 11:53] 이모티콘
[아이언맨] [오후 12:07] 이모티콘
[커리] [오후 1:11] https://naver.me/GvWMqrRW
[안느] [오후 1:13] 개인정보 다 가져다듀오~
[엔트로피] [오후 1:15] 요즘 이런게있군요
[안느] [오후 1:17] 관계자 말 들어보니 내신 5등급되고 더 심해졋다함요ㅎㅎ
[안느] [오후 1:17] 사진
[안느] [오후 1:17] 사진
[안느] [오후 1:18] 등급만 보게되면 4%는 리세마라해도 안되겟지만 10%는 비벼볼수 있다 생각하나봐요
[블랑코] [오후 1:19] 이모티콘
[릴렉스] [오후 1:53] 사진
[무명씨] [오후 2:16] ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ
[몽] [오후 2:17] 저도 이거 동의해요
[몽] [오후 2:18] 요새 10대는 다르죠... 너무 어린나이부터 받아들이는 정보가 많아서
[햇살] [오후 2:18] 사진
[에브리타임] [오후 2:18] 촉법 가중처벌 해야함. 어렸을때부터 싹을 잘라야
[몽] [오후 2:18] 부모가 쥐어 패지도못함
[햇살] [오후 2:18] 저거 보자마자 바로 떠서 ㅡ.ㅡ 카톡 검열 당하는 느낌
[햇살] [오후 2:19] 촉법은 정말 세는나이 6세까지만 해주면 좋겠어요
[몽] [오후 2:19] 요새 어린애들은 부모가 때려도 가정폭력으로 신고해버리니깐
[몽] [오후 2:19] 부모가 때려서 교정하지도 못하는
[햇살] [오후 2:19] 미친 듯..
[에브리타임] [오후 2:20] 참교육에서 촉법애들 연기 잘함
[몽] [오후 2:20] 진짜 참교육보면
[몽] [오후 2:20] 인간은 솔직히 고쳐쓰는거 아니라고 봄....
[에브리타임] [오후 2:20] 세살버릇 여든까지간다가 우리 속담이니 촉법 세살까지만
[몽] [오후 2:21] 만 셋
[커리] [오후 2:21] 가끔 학폭 터지는거보면 연기가 아닌친구들도 있지 않나요? ㅎ
[에브리타임] [오후 2:21] 생활연기 ㅋ
[커리] [오후 2:21] ㅎㅎㅎ
[몽] [오후 2:21] 은근 많을거같아여 솔직히
[에브리타임] [오후 2:22] 남의눈에 피눈물나게 하는 놈들 똑같이 당해봐야함
[몽] [오후 2:22] 우리나라는 진짜 가해자가 
[몽] [오후 2:22] 너무 피해자에 비해서
[몽] [오후 2:22] 결국 사회적으로 
[에브리타임] [오후 2:22] 참교육보고 욕하는 사람들 이해불가
[몽] [오후 2:22] 잘사는 경우가 많아서
[몽] [오후 2:22] 전 솔직하게는 제 딸이 둘 중 고른다면 그냥
[몽] [오후 2:23] 가해자가 되는게
[몽] [오후 2:23] 더 낫다고 생각함...
[몽] [오후 2:23] 그냥 가해자하고
[몽] [오후 2:23] 감옥 가라
[에브리타임] [오후 2:23] 가해자 = 혜자
[커리] [오후 2:23] 맞아요 가해자가 대처하기도 편하다고
[커리] [오후 2:23] 학교에서도 피해자가 더 힘들고...
[몽] [오후 2:23] 진짜 솔직히 피해자 보호도 안해주고
[몽] [오후 2:23] 피해자가 당하는
[몽] [오후 2:24] 정신적 육체적 고통을 생각하면
[몽] [오후 2:24] 너무 처벌이 약하죠
[몽] [오후 2:24] 그리고 보면 요즘
[몽] [오후 2:24] 너무 교묘하게
[몽] [오후 2:24] 괴롭히는 게 더 심한거같아요
[에브리타임] [오후 2:24] 사회적교화는 불가능하고 그냥 강한처벌을 해서 못된짓 못하게 해야함
[몽] [오후 2:24] 옛날에는 물리적은 불링이었다면 지금은 정신적으로 인간 하나 그냥 미치게 만들어버리는
[초심자] [오후 2:25] 사실 어릴때 범죄를 저지른건 오히려 싹이 불량해서 가중처벌해야한다고 생각해요. 미래에 더 많은 범죄를 저지를테니까요
[몽] [오후 2:25] 그런 애들이 커서 바뀐다? 그냥 성질 죽이고 사는것뿐 전 바뀐다 생각안해요 솔직히
[에브리타임] [오후 2:25] 조진웅 ㅋㅋ
[몽] [오후 2:26] 저도 고등학교때 당해봤는데 당한 사람만 기억함 
[몽] [오후 2:26] 가해자들은 시간지나니깐 너무 쿨하게 그땐 어렸으니깐 알지?
[몽] [오후 2:26] 쏘리
[초심자] [오후 2:26] 제가 국회에 가면 떡잎법을 발의해서 저연령범죄는 성년범죄보다 무겁게 처벌할 수 있게 해볼게요
[몽] [오후 2:26] 한마디하고 끝
[에브리타임] [오후 2:26] 쏘리라도 하면 다행임
[에브리타임] [오후 2:26] 그 미안하다는 말 한마디도 절대 안하는 것들이 대다수
[몽] [오후 2:27] 안하는 경우도 많죠. 맞아요....
[Kobe] [오후 2:27] 자식을 싸지르기만 하는 부모도 많아서 부모 연좌제도 해야 신경쓸듯...
[Kobe] [오후 2:27] 대신 자식 패는건 합법
[안느] [오후 2:28] 욕하는 사람이 잇어요?ㄷㄷㄷㄷ
[초심자] [오후 2:28] 모든 책임무능력자의 죄는 보호자가 책임지도록 해야..
[에브리타임] [오후 2:28] 전교조?? ㅋㅋ
[사이다] [오후 2:51] 저도 중고딩 때 샘 엄청 많은 2등이 주도해서(같은 애입니다) 왕따 몇 주씩 당해보고 했는데 몇십년이 지난 지금도 한번씩 꿈에 나옵니다.
[사이다] [오후 2:52] 걔는 대학교 때 의대생 소개팅 시켜달라고 엄청 연락하고,, 기억도 아예 못 하는 것 같아요. 줘패지 않은 건 가해라고 생각도 못하는 듯
[초심자] [오후 2:52] ㄷㄷ...
[초심자] [오후 2:52] 요샌 아예 2등이 1등 학생부전형 못쓰게 학폭위 열어버린대요
[초심자] [오후 2:53] 제낄라고
[사이다] [오후 2:53] 지가 셤 잘 본 것 같으면 그날 또 엄청 사근사근 굴다가 성적 멸로로 나오면 완전히 썡까고
[사이다] [오후 2:53] 저는 기가 좀 약하고 걔는 무당 같은 느낌에 성격이 세서 애들 리드를 잘 하고
[사이다] [오후 2:53] 와우 또 열받네요 ㅋ
[햇살] [오후 2:53] 학생부가 정말 어디든 들어봐도 참 안 좋은데
[햇살] [오후 2:53] 그걸로 먹고 사는 카르텔이 넘 강해져서 폐지를 못 한다고 들었어요
[닥쮼] [오후 2:54] 울딸이 중학교때 잠깐 괴롭힘을 당했다는데 (초등때 절친) 대학가서 만나자고 해서 .만났는데 너 중학교때 나한테 왜 그랬어 ? 이렇게 물어 보니 우리 중학교 같은 중학교였어 ? 이렇게 말해서 엄청 충격 받았더라고요. 울 딸래미는 그 기억이 엄청 상처인데 . 같은 중학교인지 조차 몰랐다니..^^;; 
[햇살] [오후 2:54] 그래서 연예인 학폭 문제 터지며ㅕㄴ 가해자들인지라 기억을 잘 못 하는건지도요
[사이다] [오후 2:55] 헐...진짜 이래요 가해자들은, 만성적인 팸 아니면 기억도 잘 못하는 것 같아요
[사이다] [오후 2:56] 걔는 과목샘이 좀 편애하는 애들도 죄다 돌아가면서 왕따시켜서 울고 다니는 애들도 있었는데
[사이다] [오후 2:56] 인과응보인지 대학도 성적에 비해 엄청 못 가고 여기저기 직장생활 떠돌고 집안도 좀 망하고 뭐 그랬단 얘기까지만 들었어요 
[사이다] [오후 2:57] 아우 어린 나 ,지켜주지 못해 미안하다.. 늙은 지금은 한소리라도 좀 따져볼 수 있을텐데, 넘 심약했네요
[닥쮼] [오후 2:57] 울 딸이 넘 황당해 하더라고요.  
[닥쮼] [오후 2:58] 토닥토닥
[사이다] [오후 2:58] 지랑 교문에서 마주치면 죽이네 어쩌네 해서 한겨울에 6시에 등교하고 그랬어요 아우
[닥쮼] [오후 2:58] ㅠㅠ
[닥쮼] [오후 2:58] 아이고. 
[닥쮼] [오후 2:58] 고생 하셨네요 . 
[안느] [오후 2:58] 중학교 다니다가 강전 간거 아닐까요
[안느] [오후 2:58] 그래서 자기랑 같은 중학교라고 생각도 못하는걸지도...
[닥쮼] [오후 2:58] 그 정도 학폭은 아니고. 무리지어 따돌리고 놀리고 .. 그런건가봐요. 그 당시 저는 몰랐는데 
[사이다] [오후 2:58] ㅠㅠ 위로 감사합니다. 맻힌 게 넘 많네요. 
[닥쮼] [오후 2:59] 왜 얘기 안 했냐 하니까. 엄마 성격상 학교 다 뒤집어 놓을것 같은데 . 그러면 자기가 학교다니기 너무 힘들것 같아서 말 못했다고 
[닥쮼] [오후 2:59] 대학생인 지금 말하다가 닭똥같은 눈물을 흘리더라고요 .ㅠㅠ 
[energyup] [오후 2:59] 원장님들 혹시 강남쪽인데, 하이쥬 같은 물광주사 15cc 정도 파시거나 차용해주실 분 계실까요? ㅠㅠ 퀵으로 ㅠㅠㅠㅠ
[햇살] [오후 2:59] 에이구 ㅠ.ㅠ
[사이다] [오후 2:59] 저희 딸도 중딩 때 일진 같은 애한테 돈 뱄기고 그래서 저한테 막 울고 하소연하고 했는데 고딩 떄 물어보니 진짜 기억을 못하는 것 같더래요
[사이다] [오후 3:02] 보통 부모도 썩을 것들입니다. 그런 애들은. 저희 애 초딩 때 좀 약해보이는 애들은 죄다 괴롭히는 애 있었는데 항의가 많이 들어오니 담임샘이 엄마한테 연락했더니, ㄱ아 그런 게 리더십이고 카리스마 아니냐 라고 했다면 담임도 분개했던 애도 있어요
[후이] [오후 3:08] 저희 엘라비에 밸런스 사용중인데 보내드릴까요?
[몽] [오후 3:09] 저도 이거 들었어요 ㅠㅠ 새로 법 바뀌고나서 과학고 특목고에서 그렇게 학폭 신고가 많이 들어온다고....
[무명씨] [오후 3:09] 와 이건 ㅠ 쓰레기네요 ㅠ
[무명씨] [오후 3:09] 요새 학폭 어쩌고면 아예 대학을 갈 수가 없던데 ㅠ
[몽] [오후 3:10] 맴찟
[릴렉스] [오후 3:10] 괴롭히는 것도 문제인데
[릴렉스] [오후 3:10] 애들끼리 자라면서 있을만한 트러블도 다 학폭되서;;
[몽] [오후 3:10] 저 가능해용 갠톡주시면 보내드릴수있어용 파마리서치꺼 있어여
[닥쮼] [오후 3:11] 이것도 문제예요. 학교에서 다치면 어린이집에서 다치면. 진짜 부모들이 쌍심지를 켜고 병원으로 오고 .ㅠㅠ 
[몽] [오후 3:11] 저 안그래도 딸램이 아직 어리긴한데.. 친구들이 본인이 하기 싫은행동을 계속하는데 선생님께 오히려 하지마라 소리지는 본인만 혼났다고 해서..

1번째: 말로한다
2번째:어른에서 도움을 요청한다
3번째: 말로 해결이 안되면 그냥 너도 몸을 써라

이랬어요..
[몽] [오후 3:15] 저 아는 지인은 소송 갔어여 ㅠㅠ 어린이집에서 다친걸로 상대부모가 유치원이랑 친구부모 상대로 소송걸었음 ㅠㅠ
[닥쮼] [오후 3:15] 헐...
[햇살] [오후 3:16] 미쳤네요 진짜 
[닥쮼] [오후 3:17] 제 아시는 분은 큰 유치원 원장님인데 . 초임 교사 아동학대로 신고당해서 (증거 없으나 모든 지역맘 까페 및 블로그 도배 ) 그거 처리하다가 오만정 다 떨어져서 폐업하고 요양원으로 바꾸시더라고요 . 
[몽] [오후 3:17] ㅠㅠㅠㅠㅠㅠ
[몽] [오후 3:17] 꼭 악질은 어딜가나 있음….
[커리] [오후 3:19] 내리사랑이라 요양원이 좀 나으려나요
[무명씨] [오후 3:19] 그럴리가요 ㅠ
[energyup] [오후 3:19] 앗 원장님들 빌렸습니다 ㅠㅠㅠ 감사합니다 ㅠㅠㅠㅠ 
[무명씨] [오후 3:19] 왜 자꾸 그 분은 그런 업종만 고르시는건지 ㅠ
[커리] [오후 3:19] 아닌가요 ㅠㅠ
[무명씨] [오후 3:19] 어린이집 보다.. 못하지 않을 듯 ㅠ
[커리] [오후 3:19] 아이고 ㅠㅠ
[후이] [오후 3:20] 오 네네 다행입니다!!
[초심자] [오후 3:21] 요양병원 보시면.. 요양원도 쉽진않을듯요
[콩순이] [오후 3:22] 저희애도 어릴때 놀이터에서 자꾸 10개월 빠른 덩치큰애가 괴롭히는데 그집엄마가 다른엄마들하고 수다만 떨고 멀리서 하지마~ 이런식으로만 하길래
[콩순이] [오후 3:22] 봐주시던 저희엄마가 또 그러면 때려버리라고 해서 저희애가 한번 때렸다고 울더래요. 
[무명씨] [오후 3:22] 저는.. 사실..  걍.. 의식도 거의 없다시피한 고령 인구가... 의료비를 너무 많이 쓰고... 의미 없을 지도 모르는?  수명만 연장 하는게 아닌가.. 하는 생각이 있엇는데
[무명씨] [오후 3:23] 요새 대학 병원 현실을 보니까 ㅠㅠ 그런 걱정은 안 해도 될거 같더라고요 ㅠ
[무명씨] [오후 3:23] 그간 한국 사람들이 필요 이상으로 너무 목숨 부지를 잘 했던.... 그 시절은 이제 간듯요 ㅠ
[초심자] [오후 3:23] 그거때문에 한의학을 못놓는걸지도 몰라요
[콩순이] [오후 3:23] 그러니까 와가지고는 막 항의하면서 난리치다가 그집애가 먼저그래서 때리라고 했다고 하니까 어떻게 교육을 그렇게 시키냐, 그리고 본인애가 때릴리가 없다는 식으로 말했대요. 근데 그집 여자애 오빠가 옆에서 자기동생이 먼저 때렸다고 이실직고 하니까 갑자기 웃으면서 남자애한테 어머 그걸 이야기 하면 어떻게 해 그러더라는;;;;
[초심자] [오후 3:23] 헐..
[초심자] [오후 3:24] 어릴때부터 거짓말 음해가르치네
[콩순이] [오후 3:24] 저희애랑 그러다가 다른애 여러명하고도 트러블 생겨서 왕따되니까 나중에는 좀 고쳤는지 2년뒤에 갑자기 사과하더라는;;;
[초심자] [오후 3:25] 고친게 아니라 그런애들은 자기가 불리해지면 사과해요
[무명씨] [오후 3:25] 제 생각도 ㅋ
[무명씨] [오후 3:25] 아쉬운게 있는거죠 ㅋ
[콩순이] [오후 3:25] 아무튼 그집 엄마때문에 애가 마음을 고쳐먹었다고 해도 안놀리고 싶긴해요
[무명씨] [오후 3:25] 당근요. 사람 안 바뀜 
[초심자] [오후 3:26] 마음을 고쳐먹을 수가 없어요 그냥 환경이 바뀐것뿐
[초심자] [오후 3:26] 떡잎이 노랗다면 싹을 자르는게 답
[콩순이] [오후 3:26] 저희애 학교에는 모 야구선수 자녀라는데 초2때인가 강제전학을 3번째 온 애가 있다고도 들었어요;;;
[닥쮼] [오후 3:27] 참고로. 요양원이 좀 나으신가봐요 
워낙 큰 유치원이라(단독건물) 식당도 있고 마당도 있고 주차장도 있고 다른 업종으로 변경은 어려웠던것 같고 . 유지원에서 요양원 으로는 업종 변경이 가능한가봐요 . 유치원4개 운영하시던 분인데 전부 요양원으로 변경 했어요 . 요양원이 매매도 더 잘 된다고 했던것 같네요 
[콩순이] [오후 3:27] 강제전학 당했으면 고쳐야하는데 안고쳐진건지 또 강제전학;;;
[감사] [오후 3:27] 사진
[감사] [오후 3:27] 챗지피티 답인데 맞나요. . ? 
[초심자] [오후 3:27] ㄷㄷ..
[감사] [오후 3:29] 연봉협상 해야되는데 시세가 이정도일줄이야. .
[몽] [오후 3:33] 야구선수들이 보면 좀… 말투랑 좀… 못 배운 경우들이 많은듯한
[몽] [오후 3:34] 맞는거같아요 ㅡ
[감사] [오후 3:42] 저렇게 주고 부원장님 넷 2천 주고도 더 가져가는데가 많은거군요. .
[감사] [오후 3:43] 접고 봉직해야하나. .
[무명씨] [오후 3:44] 페이도 페이지만 ㅠㅠ 4대 보험 ㅠ
[무명씨] [오후 3:44] 페이 선생님 3분 모시면 ㅠㅠ 1억 ㅠ
[무명씨] [오후 3:45] 사진
[커리] [오후 3:45] 직원도 한 20명 있지 않나요? 30명인가요...
[무명씨] [오후 3:45] 30명 ㅋ
[무명씨] [오후 3:45] 카드 포인트는 대박 쌓일듯 ㅋ
[안느] [오후 3:46] 수준은 간조의 수준이 아니라 급여의 수준이네요ㅋㅋㅋ
[무명씨] [오후 3:46] 근데 지금도.. 진짜 모발 이식 성지로 되어 가고있짢아요 ㅋ 
[무명씨] [오후 3:46] 터키 의사들 머리 심는거만.. 호황 이라고 ㅎ 
[무명씨] [오후 3:46] 우리도 그리 되려나요 ㅎ 
[감사] [오후 3:46] 그니까요. . 간조가 실수350 이상이면 상여까지 연봉 5천이네요
[무명씨] [오후 3:47] 고졸 간조가 가성비 갑 
[아이언맨] [오후 3:47] 가성비로 치면 여기계신 분들은..
[아이언맨] [오후 3:47] ㅠㅠ
[감사] [오후 3:48] 그럼 대졸자는 경력 5년 넘으면 웬만함 다 1억 줘야되겠네요
[아이언맨] [오후 3:49] 피부과 직원이 1억받을 일을 할게 있나요...
[무명씨] [오후 3:51] 그건 우리 생각이고 ㅠ
[무명씨] [오후 3:51] 그분들은 나름 전문직이시라 자기들 원하는 포지션? 잡 아니면 일도 안 구하시더라고요 ㅠ
[무명씨] [오후 3:52] 저희도 근처 폐업한 데가 있어서 거기 직원들 몇 컨택 해보앗는데.... 실업 급여가 너무 잘 나오고 ㅠㅠ 더더군다나 폐업이니 ㅠ
[아이언맨] [오후 3:52] 어이쿠
[무명씨] [오후 3:52] 자기 원하는 포지션 만 쏙 골라 하고 싶다고 해서 못 했.... ㅠ
[아이언맨] [오후 3:54] 힘드네요 
[초심자] [오후 3:54] 저도 이거 그만하고 실업급여 받고싶네요..
[무명씨] [오후 3:54] 사장님 힘내세요. 우리에겐 노란 우산 공제가 있어영 ㅋ
[커리] [오후 3:56] 사진
[커리] [오후 3:56] 클로드가 이렇게 계산해주는데.....얘가 잘 모르는거겠죠?
[무명씨] [오후 3:57] 인건비 20 억 ㅠ
[무명씨] [오후 3:58] 직원 20명 잡이 봉직  2명 + 원장 하나.. 이걸로 커버가 될까요?. 
[무명씨] [오후 3:58] 월매 3억이면 적자각일듯 ㅠ
[초심자] [오후 4:00] 노랑우산은 제돈 제가 받는거자나요 ㅋㅋ
[무명씨] [오후 4:00] 그니까요 ㅋ
[무명씨] [오후 4:00] 우린 스스로 도와야 
[초심자] [오후 4:00] 남의돈먹고싶어영...빼애액
[무명씨] [오후 4:00] 그럴리가 ㅠ
[무명씨] [오후 4:00] 있는거 다 뺏기는 마당에요 ㅠ
[크롱~] [오후 4:02] 심지어 세전이라는 ㄷ ㄷ...
[무명씨] [오후 4:02] 저기서 부가세 내고 종소세 내고 ㅋ 지방세 내고 
[무명씨] [오후 4:02] 퇴직연금 가입 하고 ㅎ
[무명씨] [오후 4:02] 출산 휴가 육아 휴직 주고 퇴직금 적립하고 ㅎ
[안느] [오후 4:03] 피부과가 많아지고, 소위 네트워크 셋팅에 직원 월급이 많이 우상향되버린...
[안느] [오후 4:03] 면접보면서 직전 직장 급여나 희망급여보면 아 대학을 갈필요가 없겟구나를 생각하게됏졍
[초심자] [오후 4:04] 인생은 노력이 아닌 운빨이다..
[커리] [오후 4:04] 하이닉스 10만원 아래일때 얼마를 넣었냐가 가장 중요한 
[아이언맨] [오후 4:10] 이번에 또 최저시급 13000원?으로 올려달라고 하던데 그거보고 또 현타왔죠...
[커리] [오후 4:11] 곧 평균 실수령 400보겠네요
[햇살] [오후 4:12] 다른 의미의 어이없는..
[Kobe] [오후 4:12] 사진
[Kobe] [오후 4:12] ㅎㄷㄷㄷㄷㄷㄷ
[Kobe] [오후 4:12] 돈 다 퍼주고 나면 뭘로 투자하고 발전하나요...
[아이언맨] [오후 4:13] 다시 땅파먹고 살던 시절로...
[아이언맨] [오후 4:13] 흙파먹엉...
[아이언맨] [오후 4:14] 지노위 중노위 어차피 다 눈가리고 노동자편인데 당연한 결과인거슬
[릴렉스] [오후 4:17] 사진
[릴렉스] [오후 4:17] 사진
[Kobe] [오후 4:37] 사진
[Kobe] [오후 4:37] 사진
[Kobe] [오후 4:37] 동탄 27평 20억 신고가 ㄷㄷㄷ
[Kobe] [오후 4:38] 동탄 매도자들 장첸이라네요
[Kobe] [오후 4:38] 가격보고 전화하면 그자리서 몇억씩 올림
[크롱~] [오후 4:43] 장첸 ㅎㅎㅎㅎㅎㅎ
[Kobe] [오후 4:44] 사진
[엔트로피] [오후 4:44] ㅋㅋㅋ
[엔트로피] [오후 4:44] 20억엔 아이되겠소~
[커리] [오후 4:45] 사진
[쿤타치] [오후 4:45] 이게 웃을 일이 아닌게 지금 당장 집을 사야하는 상황인데 요새 매도자 갑인 상황이라 최근 3주째 부동산 문제로 연이어 어려움을 겪고 있습니다ㅜㅜ
[커리] [오후 4:45] 동탄 롯캐 84 저층 가격이...
[쿤타치] [오후 4:46] 첫 번째 매물은 계약 한 시간 전에 일방적으로 연락이 두절되었고, 두 번째 매물은 해외 체류를 이유로 연락이 지연되더니 갑자기 매매가를 올리겠다고 하더군요 어제도 세 번째 매물 건으로 일주일간 집주인쪽 중개사와 소통하며 퇴근 후에 분주히 움직였습니다만, 그마저도 거래 직전에 가격을 올리겠다는 통보를 받아 허탈하게 발걸음을 돌려야 했습니다
[쿤타치] [오후 4:47] 기본적인 인간으로서 도리를 지킨다면 이리 모질게 굴어도 되나 생각이 들었습니다 첫번째 한 시간 전 잠수 탄 집주인에 대해 환멸을 느낄 사이도 없이 두세번째에 같은 일을 당하니
[쿤타치] [오후 4:50] https://www.mk.co.kr/news/economy/12072516
[쿤타치] [오후 4:52] 오히려 이런 상황이면 더 낮춰서 파는 상황이 되어야 하는데 이해할 수 가 없습니다 그렇게 아들, 딸 뻘 되는 매수자에게 갑질하면 뭐라도 되는 줄 아는건지 최근 연배가 있으신 임대인분들의 미성숙하고 무책임한 언행을 마주하며 깊은 환멸을 느꼈습니다 사회적 모범을 보여야 할 위치에서 오히려 상식 밖의 행동을 하시는 모습을 보며, 부동산 문제를 원칙대로 해결해 나가는 것이 얼마나 험난한 과정인지 뼈저리게 실감하고 있습니다
메시지가 삭제되었습니다.
[안느] [오후 5:39] https://n.news.naver.com/article/057/0001954128
[안느] [오후 5:39] ;;
[Kobe] [오후 5:43] 죄송합니다 ㅜㅜ 진짜 저렇게 당하면 너무 화날듯합니다...
[부산에서] [오후 5:48] ㅠ 문재앙 때도 저랬죠ㅠ 
[사이다] [오후 5:58] 동탄 토허제 얘기도 많아서 고수들은 매도 시점이라곤 하던데.
[아이언맨] [오후 6:06] 뭐라 할 말이...
[커리] [오후 6:06] 사진
[햇살] [오후 6:06] 계약금 입금하고도 매매 파토 나는 일이 비일비재하기 때문에
[햇살] [오후 6:07] 운과 손가락의 힘과 마음 합이 이뤄져야 ㅠ.ㅠ
[Kobe] [오후 6:07] 계약금이라도 빨리 쏴버리면 그거라도 벌긴 하더라구여...
[릴렉스] [오후 6:08] 그러다 떨어지기 시작하면 바로 전세역전되서 … 
[진짜푸웩춐하임춐춐] [오후 6:16] ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 
[닥쮼] [오후 6:18] 천당밑에 동탄군요 ^^;;
[쁰쁰] [오후 6:23] 저는 방에콕
[커리] [오후 6:28] https://www.kyeonggi.com/article/202106141168291
[커리] [오후 6:29] 오래전에 이런 기사도 있었는데 비슷한 느낌이 드네요
[커리] [오후 6:44] https://naver.me/FlBD7jvb
[커리] [오후 6:44] 3년전인데 무섭네요
[초심자] [오후 7:02] 와 저걸 지금와서 갑자기 뒤집는다구요?
[고군분투의] [오후 7:04] 말이안되네요

신경외과나 병상없어도 일단받고보라는건데

일단받고 수술할사람없다
그래도 과실치사로소송걸릴것같은데요?
[고군분투의] [오후 7:04] 이러나 저러나 징역빔
[초심자] [오후 7:05] 사직서를 내면 사직서수리금지명령 및 업무복귀명령..
[쿤타치] [오후 7:06] 아고 코베 원장님 아닙니다ㅜㅜ 위로의 말씀들 주셔서 감사합니다 심지어 장모님께서 교직에서 정년퇴임 후 공인중계사 증이 있으셔서 가업 부동산을 하고 계신데도 이렇게 세번을 당했습니다 오히려 장모님이 이런 경우 처음이라고 미안해하시는데 더 죄송스럽더라고요 무튼 부동산 올려 놓은 가격으로 팔지 않고 계속 낚시질 하는 주인들 정말 천벌 받길 바랍니다 연속으로 당해보면 정말 너무 화가 납니다ㅠ
[커리] [오후 7:09] 요즘 분위기를 잘 모르는데 배액배상이 많이 나오나보네요 ㅠ
[비만] [오후 7:19] 복싱장초딩애들이 엔비디아사야된다 테슬라사야된다 스페이스엑스가상장했으니 비트코인은한물갔다 자기삼촌은주식으로2억벌었다...고하네요

슬 주식뺄때가오는가봅니다ㅋㅋ
[초심자] [오후 7:23] 비트코인의 시대가 오나 봅니다..
[커리] [오후 7:24] 다시 1억 넘고있네요 ㅋ
[비만] [오후 7:24] 속으로 그렇게생각했죠 지금같은장에 누가2억못번다고 바보아냐??


-바보비만
[뚜비두또밥] [오후 7:28] 그 사람이 바로 나에요 ~~
[커리] [오후 7:31] https://naver.me/G8fN1dcp
[안느] [오후 7:31] 2222
[커리] [오후 7:45] https://n.news.naver.com/article/666/0000111480
[쥬비덤] [오후 7:45] 빚만 늘었습니다...
[안느] [오후 7:47] 근데 아빠는 물렷나보네여
[안느] [오후 7:48] 삼촌얘기만 하는거 보니
[몽] [오후 9:32] 댓글이 왜 정상적이죠? 불안하네
--------------- 2026년 6월 17일 수요일 ---------------
[999호/fill] [오전 7:33] 이모티콘
[777신사동신사] [오전 7:37] 이모티콘
[브랜드순수] [오전 7:53] 이모티콘
[아빠곰] [오전 7:58] 이모티콘
[탈모전문] [오전 8:02] 이모티콘
[가을처럼] [오전 8:26] 이모티콘
[통닥] [오전 8:30] 이모티콘
[피노르] [오전 8:33] 이모티콘
[성실의] [오전 8:35] 이모티콘
[코술코러] [오전 9:04] 이모티콘
[로즈마리] [오전 9:14] 이모티콘
[커리] [오전 9:25] https://naver.me/xJcSD8Sg
[커리] [오전 9:25] 속보요
[어머나] [오전 9:34] 이모티콘
[엔트로피] [오전 9:35] 이모티콘
[햇살] [오전 9:37] 닉스도 뭐 푸쉬받나요
[화샤친] [오전 9:49] 이모티콘
[아이언맨] [오전 10:01] 이모티콘
[피터팬] [오전 10:02] 이모티콘
[토리사시] [오전 10:53] https://m.youtube.com/watch?v=0j6Z-Pa0pN4&pp=ugUEEgJrbw%3D%3D&ra=m
[토리사시] [오전 10:53] 사진
[토리사시] [오전 10:53] 사진
[토리사시] [오전 10:53] 사진
[토리사시] [오전 10:53] 사진
[토리사시] [오전 10:53] 이모티콘
[비좀] [오전 10:54] 이모티콘
[커리] [오후 1:23] https://n.news.naver.com/article/087/0001199673
[안느] [오후 2:38] 사진
[안느] [오후 2:38] 사진
[안느] [오후 2:38] 사진
[사이다] [오후 6:07] ㅎㅎㅎㅎㅎ 빵터졌네요
[릴렉스] [오후 6:11] 동영상
[릴렉스] [오후 6:11] 직관...
[무명씨] [오후 6:35] https://n.news.naver.com/article/081/0003653422
[무명씨] [오후 6:35] 어휴ㅠ
[ZARA] [오후 6:38] 재건할 자금 주려면 왜 뿌신겨 -.-
[안느] [오후 6:39] 전세계 주식장 세일 거하게 열어줫네요
[몽] [오후 6:40] ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 정말ㅋㅋㅋ 
[Kobe] [오후 6:41] 시장에 활기 돌았쥬?
[몽] [오후 6:42] 호텔경영학론
[치킨마요] [오후 6:42] ㅋㅋㅋㅋㅋㅋㅋ
[비만] [오후 6:51] 정체된거같아서활기를..?
[초심자] [오후 6:52] 항상 제 세금 낭비되는것만 보다가 미국시민들 세금 낭비되는거 보니깐 기분이 좋네요
[초심자] [오후 6:52] 우리 건설회사에서 재건수주를 받길 기대해봅니다
[무명씨] [오후 7:21] 근데 원은 왜 더 골로가는지 ㅠ
[무명씨] [오후 7:22] 심지어 수출 많이해서 달러도 들어오는데 ㅠ
[Kobe] [오후 7:46] 사진
[Kobe] [오후 7:46] 잘 정리되어 있네요
[어느새흑자1] [오후 7:58] 뭘 해도 하이닉스 수혜주처럼 보이는건
[어느새흑자1] [오후 7:58] 아 모든 답이 똑같았네요
[엔트로피] [오후 8:06] ㅋㅋㅋㅋ
[커리] [오후 9:50] https://naver.me/5IfQylDY
[커리] [오후 10:14] https://naver.me/xPYJgQoM
[Kobe] [오후 10:16] 재매이햄한테 머라해야지...
[커리] [오후 10:18] 주인이라…
[치킨마요] [오후 10:26] 드럼통 조심하셔야...
[커리] [오후 10:46] https://youtu.be/qtJSZxSdZfg?si=RY5zt7aA4-gi6i2v`;

// DOM Elements Initialization
const fileInput = document.getElementById('file-input');
const btnFileLoader = document.getElementById('btn-file-loader');
const fileInfo = document.getElementById('file-info');
const fileNameSpan = document.getElementById('file-name-span');
const fileSizeSpan = document.getElementById('file-size-span');
const btnClearFile = document.getElementById('btn-clear-file');
const detectedPlatformBadge = document.getElementById('detected-platform-badge');

const chkStartDate = document.getElementById('chk-start-date');
const inputStartDate = document.getElementById('input-start-date');
const selectDormancy = document.getElementById('select-dormancy');
const selectChatCondition = document.getElementById('select-chat-condition');
const btnToggleEmoji = document.getElementById('btn-toggle-emoji'); // Emoticon filter button
const inputActualMembers = document.getElementById('input-actual-members');
const btnAnalyze = document.getElementById('btn-analyze');

// Background Music DOM
const bgMusic = document.getElementById('bg-music');
const btnMusicToggle = document.getElementById('btn-music-toggle');
const musicVisualizer = document.getElementById('music-visualizer');

const dashboardContent = document.getElementById('dashboard-content');

// Ghost board DOM
const ghostCapacityEl = document.getElementById('ghost-stat-actual-capacity');
const ghostActiveEl = document.getElementById('ghost-stat-active-members');
const ghostDormantEl = document.getElementById('ghost-stat-dormant-members');
const ghostDormantCriteriaEl = document.getElementById('ghost-stat-dormant-criteria');
const ghostGhostEl = document.getElementById('ghost-stat-ghost-members');
const ghostRateEl = document.getElementById('ghost-stat-ghost-rate');

// Tabs DOM
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tabsSearchArea = document.getElementById('tabs-search-area');
const searchUsernameInput = document.getElementById('search-username');

// Tables DOM
const usersTableBody = document.getElementById('users-table-body');
const hourlyTableBody = document.getElementById('hourly-table-body');
const rawChatsViewer = document.getElementById('raw-chats-viewer');

// Bottom summary DOM
const summaryChatters = document.getElementById('summary-total-chatters');
const summaryChats = document.getElementById('summary-total-chats');
const summaryLeaves = document.getElementById('summary-total-leaves');
const summaryJoins = document.getElementById('summary-total-joins');

// Interaction controls DOM
const btnProtectReentrants = document.getElementById('btn-protect-reentrants'); // Re-entrant protection toggle
const btnRemoveLeavers = document.getElementById('btn-remove-leavers');
const btnSaveExcel = document.getElementById('btn-save-excel');
const btnClearAnalysis = document.getElementById('btn-clear-analysis');

// Collapsible charts section DOM
const btnToggleCharts = document.getElementById('btn-toggle-charts');
const collapsibleAnalyticsContent = document.getElementById('collapsible-analytics-content');
const collapsibleSection = document.querySelector('.collapsible-section');

// Dynamic Filter Controls
const filterLowActivity = document.getElementById('range-low-activity');
const valLowActivity = document.getElementById('val-low-activity');
const filterDormantDays = document.getElementById('range-dormant-days');
const valDormantDays = document.getElementById('val-dormant-days');
const filterElapsedDays = document.getElementById('range-elapsed-days');
const valElapsedDays = document.getElementById('val-elapsed-days');
const filterPeriodPreset = document.getElementById('filter-period-preset');
const periodRangeDisplay = document.getElementById('period-range-display');
const filteredUsersBody = document.getElementById('filtered-users-body');
const targetCountEl = document.getElementById('target-count');
const btnDownloadFilteredExcel = document.getElementById('btn-download-filtered-excel');

// Modal Elements
const usersModal = document.getElementById('users-modal');
const btnShowAllUsersModal = document.getElementById('btn-show-all-users-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalUsersBody = document.getElementById('modal-users-body');

const filteredUsersModal = document.getElementById('filtered-users-modal');
const btnShowFilteredModal = document.getElementById('btn-show-filtered-modal');
const btnCloseFilteredModal = document.getElementById('btn-close-filtered-modal');
const modalFilteredUsersBody = document.getElementById('modal-filtered-users-body');

// Chart resolutions
const timeResolutionSelect = document.getElementById('time-resolution');
const btnChartBar = document.getElementById('btn-chart-bar');
const btnChartLine = document.getElementById('btn-chart-line');
let activeChartType = 'line'; // 'bar' or 'line'

// Loading Modal controls
const loadingModal = document.getElementById('loading-modal');
const loadingStatusEl = document.getElementById('loading-status');
const loadingTimerEl = document.getElementById('loading-timer');

function showLoadingModal(statusText) {
  if (!loadingModal) return;
  if (loadingStatusEl) loadingStatusEl.innerText = statusText || '분석을 준비하고 있습니다...';
  if (loadingTimerEl) loadingTimerEl.innerText = '0.0초';
  loadingModal.style.display = 'flex';
  
  loadingStartTime = Date.now();
  if (loadingTimerInterval) clearInterval(loadingTimerInterval);
  loadingTimerInterval = setInterval(() => {
    if (loadingTimerEl) {
      const elapsed = ((Date.now() - loadingStartTime) / 1000).toFixed(1);
      loadingTimerEl.innerText = `${elapsed}초`;
    }
  }, 100);
}

function hideLoadingModal() {
  if (loadingModal) {
    loadingModal.style.display = 'none';
  }
  if (loadingTimerInterval) {
    clearInterval(loadingTimerInterval);
    loadingTimerInterval = null;
  }
}

// Setup Event Listeners
function initEvents() {
  // Populate dropdowns dynamically
  populateDropdowns();

  // Initialize Music Player
  initMusicPlayer();

  // Initialize Emoticon Filter Toggle
  initEmojiToggle();

  // Initialize Glossy Cursor Spotlight Effects
  initGlossyCursorEffects();

  // Initialize resizable tables
  makeTableResizable(document.getElementById('users-table'));
  makeTableResizable(document.getElementById('hourly-table'));

  // Handle Offline report layout initial rendering
  if (window.isOfflineReport && window.offlineData) {
    // Hide file upload UI
    const fileLoaderCard = document.querySelector('.file-loader-card');
    if (fileLoaderCard) {
      fileLoaderCard.innerHTML = `
        <div class="offline-badge-wrap" style="text-align: center; padding: 10px; color: var(--primary);">
          <i class="fa-solid fa-lock" style="font-size: 24px; margin-bottom: 8px;"></i>
          <div style="font-size: 13px; font-weight: 700;">오프라인 리포트 모드</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">대화 데이터가 고정되어 있습니다.</div>
        </div>
      `;
    }
    // Load pre-configured date ranges
    chatLogs = window.offlineData.chatLogs;
    masterUsers = window.offlineData.masterUsers;
    activeUsers = window.offlineData.activeUsers;
    totalStats = window.offlineData.totalStats;
    detectedPlatform = window.offlineData.detectedPlatform;

    // Render platform badge
    renderPlatformBadge();
    
    // Enable calendar and filters
    updateDateFilterRanges(chatLogs);
    btnAnalyze.removeAttribute('disabled');

    // Auto-expand charts section in offline mode
    const chartsSection = document.getElementById('btn-toggle-charts')?.parentElement;
    if (chartsSection) {
      chartsSection.classList.add('open');
    }

    // Run initial rendering
    setTimeout(() => {
      renderDashboard();
    }, 100);
  }

  // Prevent click propagation from the file input itself
  fileInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Action Buttons
  btnAnalyze.addEventListener('click', () => {
    playSfClickSound();
    startAnalysis();
  });
  btnClearFile.addEventListener('click', () => {
    playSfClickSound();
    clearFileSelection();
  });
  btnClearAnalysis.addEventListener('click', () => {
    playSfClickSound();
    clearAllAnalysis();
  });
  btnRemoveLeavers.addEventListener('click', () => {
    playSfClickSound();
    toggleLeaversVisibility();
  });

  // Protect re-entrants toggle button
  if (btnProtectReentrants) {
    btnProtectReentrants.addEventListener('click', () => {
      playSfClickSound();
      toggleProtectReentrants();
    });
  }

  // Start Date Checkbox handler
  chkStartDate.addEventListener('change', (e) => {
    playSfClickSound();
    inputStartDate.disabled = !e.target.checked;
  });

  // Tabs Handler
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playSfClickSound();
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      document.getElementById(activeTab).classList.add('active');
      
      // Control search input visibility
      if (activeTab === 'tab-raw') {
        tabsSearchArea.style.display = 'none';
      } else {
        tabsSearchArea.style.display = 'flex';
      }

      renderTabContent();
    });
  });

  // Accordion toggle handler
  btnToggleCharts.addEventListener('click', () => {
    playSfClickSound();
    collapsibleSection.classList.toggle('open');
    if (collapsibleSection.classList.contains('open')) {
      // Trigger charts redraw to adjust to container width
      setTimeout(() => {
        renderUserRatioChart();
        updateTimeSeriesChart();
        renderHourlyActivityChart();
        renderWeeklyActivityChart();
        renderTopicDistributionChart();
      }, 50);
    }
  });

  // Search filter
  searchUsernameInput.addEventListener('input', () => {
    renderTabContent();
  });

  // Excel Downloads
  btnSaveExcel.addEventListener('click', () => {
    playSfClickSound();
    exportExcelByTab();
  });
  btnDownloadFilteredExcel.addEventListener('click', () => {
    playSfClickSound();
    exportFilteredToExcel();
  });

  // Modal toggle
  btnShowAllUsersModal.addEventListener('click', () => {
    playSfClickSound();
    showRankModal();
  });
  btnCloseModal.addEventListener('click', () => {
    playSfClickSound();
    usersModal.style.display = 'none';
  });
  usersModal.addEventListener('click', (e) => {
    if (e.target === usersModal) usersModal.style.display = 'none';
  });

  // Filtered Users Modal Toggle
  if (btnShowFilteredModal && btnCloseFilteredModal && filteredUsersModal) {
    btnShowFilteredModal.addEventListener('click', () => {
      playSfClickSound();
      showFilteredModal();
    });
    btnCloseFilteredModal.addEventListener('click', () => {
      playSfClickSound();
      filteredUsersModal.style.display = 'none';
    });
    filteredUsersModal.addEventListener('click', (e) => {
      if (e.target === filteredUsersModal) filteredUsersModal.style.display = 'none';
    });
  }

  // Chart Controls
  timeResolutionSelect.addEventListener('change', () => {
    playSfClickSound();
    updateTimeSeriesChart();
  });
  btnChartBar.addEventListener('click', () => {
    playSfClickSound();
    btnChartBar.classList.add('active');
    btnChartLine.classList.remove('active');
    activeChartType = 'bar';
    updateTimeSeriesChart();
  });
  btnChartLine.addEventListener('click', () => {
    playSfClickSound();
    btnChartLine.classList.add('active');
    btnChartBar.classList.remove('active');
    activeChartType = 'line';
    updateTimeSeriesChart();
  });

  // Target Filter Controls
  filterLowActivity.addEventListener('input', (e) => {
    valLowActivity.innerText = e.target.value + '회';
    runTargetFiltering();
  });
  filterDormantDays.addEventListener('input', (e) => {
    valDormantDays.innerText = e.target.value + '일';
    runTargetFiltering();
  });
  filterElapsedDays.addEventListener('input', (e) => {
    valElapsedDays.innerText = e.target.value + '일';
    runTargetFiltering();
  });
  filterPeriodPreset.addEventListener('change', () => {
    runTargetFiltering();
  });

  // Condition elements triggers
  selectDormancy.addEventListener('change', () => {
    playSfClickSound();
    calculateGhostMetrics();
    renderTabContent();
  });
  selectChatCondition.addEventListener('change', () => {
    playSfClickSound();
    if (rawChatText) {
      startAnalysis();
    }
  });

  // Chart share percentage adjusters
  const btnSharePctDec = document.getElementById('btn-share-pct-dec');
  const btnSharePctInc = document.getElementById('btn-share-pct-inc');
  const labelSharePct = document.getElementById('label-share-pct');

  if (btnSharePctDec && btnSharePctInc && labelSharePct) {
    btnSharePctDec.addEventListener('click', () => {
      playSfClickSound();
      if (chartSharePercent > 1) {
        chartSharePercent = Math.max(1, chartSharePercent - 1);
        labelSharePct.innerText = `${chartSharePercent}%`;
        renderUserRatioChart();
      }
    });

    btnSharePctInc.addEventListener('click', () => {
      playSfClickSound();
      if (chartSharePercent < 50) {
        chartSharePercent = Math.min(50, chartSharePercent + 1);
        labelSharePct.innerText = `${chartSharePercent}%`;
        renderUserRatioChart();
      }
    });
  }

  // Chart Member Select handler
  const chartMemberSelect = document.getElementById('chart-member-select');
  if (chartMemberSelect) {
    chartMemberSelect.addEventListener('change', () => {
      playSfClickSound();
      updateTimeSeriesChart();
      renderHourlyActivityChart();
      renderWeeklyActivityChart();
      renderTopicDistributionChart();
    });
  }

  // Print & HTML Export Action Bindings
  const btnPrintReport = document.getElementById('btn-print-report');
  const btnDownloadHtml = document.getElementById('btn-download-html');
  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
      playSfClickSound();
      const chartsSection = document.getElementById('btn-toggle-charts')?.parentElement;
      if (chartsSection && !chartsSection.classList.contains('open')) {
        chartsSection.classList.add('open');
        setTimeout(() => {
          if (typeof renderUserRatioChart === 'function') renderUserRatioChart();
          if (typeof updateTimeSeriesChart === 'function') updateTimeSeriesChart();
          if (typeof renderHourlyActivityChart === 'function') renderHourlyActivityChart();
          if (typeof renderWeeklyActivityChart === 'function') renderWeeklyActivityChart();
          if (typeof renderTopicDistributionChart === 'function') renderTopicDistributionChart();
          setTimeout(() => {
            window.print();
          }, 300);
        }, 350);
      } else {
        window.print();
      }
    });
  }
  if (btnDownloadHtml) {
    btnDownloadHtml.addEventListener('click', () => {
      playSfClickSound();
      exportInteractiveHtml();
    });
  }

  // ToriChat Logo & Crown Box Demo Data trigger
  const logoArea = document.querySelector('.logo-area');
  const headerLogoBox = document.querySelector('.header-logo-box');
  if (logoArea) {
    logoArea.addEventListener('dblclick', () => {
      playSfClickSound();
      loadDemoData();
    });
  }
  if (headerLogoBox) {
    headerLogoBox.addEventListener('click', () => {
      playSfClickSound();
      loadDemoData();
    });
  }

  // Initialize Ghost Finder modal and events
  initGhostFinder();

  // Bind SFX sounds to all UI clickable elements initially
  setTimeout(bindButtonSfx, 500);

  // Load Dynamic Taxonomy
  loadTaxonomy();

  // Bind Topic Explorer Modal close events
  const btnCloseTopicModal = document.getElementById('btn-close-topic-modal');
  const topicExplorerModal = document.getElementById('topic-explorer-modal');
  if (btnCloseTopicModal && topicExplorerModal) {
    btnCloseTopicModal.addEventListener('click', () => {
      playSfClickSound();
      topicExplorerModal.style.display = 'none';
    });
    topicExplorerModal.addEventListener('click', (e) => {
      if (e.target === topicExplorerModal) {
        topicExplorerModal.style.display = 'none';
      }
    });
  }
}

// Automatically scan and update date filter inputs based on parsed logs
function updateDateFilterRanges(parsedLogs) {
  if (!parsedLogs || parsedLogs.length === 0) return;
  
  const timestamps = parsedLogs.map(log => log.timestamp).filter(t => !isNaN(t) && t > 0);
  let minTime = timestamps[0];
  let maxTime = timestamps[0];
  for (let i = 1; i < timestamps.length; i++) {
    const t = timestamps[i];
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }
  
  const minDate = new Date(minTime);
  const maxDate = new Date(maxTime);
  
  const minDateStr = formatDate(minDate);
  const maxDateStr = formatDate(maxDate);
  
  inputStartDate.min = minDateStr;
  inputStartDate.max = maxDateStr;
  inputStartDate.value = minDateStr;
  
  // Auto-enable start date check
  chkStartDate.checked = true;
  inputStartDate.disabled = false;
}

// File handling logic
function handleFile(file) {
  if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
    alert('TXT 형식의 텍스트 파일만 지원합니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    rawChatText = e.target.result;
    fileNameSpan.innerText = file.name;
    const sizeKb = (file.size / 1024).toFixed(1);
    fileSizeSpan.innerText = `(${sizeKb} KB)`;
    fileInfo.style.display = 'inline-flex';
    
    // Auto-detect format on load
    detectedPlatform = detectPlatformFormat(rawChatText);
    renderPlatformBadge();
    
    btnAnalyze.removeAttribute('disabled');

    // Show loading modal
    showLoadingModal('대화 기록을 파싱하고 있습니다...');
    cachedAllLogsRaw = [];

    // Scan dates and set boundaries
    const tempLogs = await parseChatText(rawChatText, detectedPlatform, { applyDateFilter: false, minLength: 0 }, (current, total) => {
      const pct = Math.round((current / total) * 100);
      if (loadingStatusEl) {
        loadingStatusEl.innerText = `대화 기록을 파싱하는 중입니다... (${pct}%)`;
      }
    });
    cachedAllLogsRaw = tempLogs;
    updateDateFilterRanges(tempLogs);
    
    // SFX Reveal sound
    playSfRevealSound();

    // Directly start analysis for a seamless UX
    await startAnalysis();
  };
  reader.readAsText(file, 'UTF-8');
}

function clearFileSelection() {
  fileInput.value = '';
  rawChatText = '';
  fileInfo.style.display = 'none';
  btnAnalyze.setAttribute('disabled', 'true');
  dashboardContent.style.display = 'none';
}

function clearAllAnalysis() {
  clearFileSelection();
  chatLogs = [];
  activeUsers = {};
  totalStats = {};
  hideLeavers = false;
  protectReentrants = false;
  btnRemoveLeavers.classList.remove('active');
  if (btnProtectReentrants) btnProtectReentrants.classList.remove('active');
  alert('모든 분석 내용이 초기화되었습니다.');
}

async function loadDemoData() {
  rawChatText = DEFAULT_DEMO_DATA;
  fileNameSpan.innerText = 'KakaoTalk_Demo_Data.txt';
  fileSizeSpan.innerText = '(29.2 KB)';
  fileInfo.style.display = 'inline-flex';
  
  detectedPlatform = detectPlatformFormat(rawChatText);
  renderPlatformBadge();
  
  btnAnalyze.removeAttribute('disabled');

  showLoadingModal('예시 대화 기록을 파싱하고 있습니다...');
  cachedAllLogsRaw = [];

  // Scan dates and set boundaries
  const tempLogs = await parseChatText(rawChatText, detectedPlatform, { applyDateFilter: false, minLength: 0 });
  cachedAllLogsRaw = tempLogs;
  updateDateFilterRanges(tempLogs);
  
  // SFX Reveal sound
  playSfRevealSound();
  
  // Directly start analysis for a seamless UX
  await startAnalysis();
}

function renderPlatformBadge() {
  let platformLabel = 'PC';
  if (detectedPlatform === 'kakao_pc') platformLabel = 'PC';
  else if (detectedPlatform === 'kakao_mobile') platformLabel = 'Mobile';
  else if (detectedPlatform === 'line') platformLabel = 'LINE';
  else if (detectedPlatform === 'telegram') platformLabel = 'Telegram';
  else if (detectedPlatform === 'band') platformLabel = 'Band';
  else if (detectedPlatform === 'whatsapp') platformLabel = 'WhatsApp';

  detectedPlatformBadge.innerText = platformLabel;
}

// ----------------------------------------------------
// Platform Format Auto-Detection Engine
// ----------------------------------------------------
function detectPlatformFormat(text) {
  const lines = text.split(/\r?\n/).slice(0, 30);
  
  let scores = {
    kakao_pc: 0,
    kakao_mobile: 0,
    line: 0,
    telegram: 0,
    band: 0,
    whatsapp: 0
  };

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // KakaoTalk PC Features
    if (line.includes('카카오톡 대화') && line.includes('님과')) scores.kakao_pc += 15;
    if (line.startsWith('저장한 날짜 :')) {
      scores.kakao_pc += 5;
      scores.kakao_mobile += 3;
    }
    if (/^-+\s+\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+.*-+$/.test(line)) {
      scores.kakao_pc += 10;
    }
    if (/^\[([^\]]+)\]\s+\[(오전|오후)\s+(\d{1,2}):(\d{2})\]/.test(line)) {
      scores.kakao_pc += 15;
    }

    // KakaoTalk Mobile Features
    if (/^\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+(오전|오후)\s+\d{1,2}:\d{2},\s+.*:/.test(line)) {
      scores.kakao_mobile += 15;
    }
    if (/^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*(오전|오후)\s+\d{1,2}:\d{2},\s+.*:/.test(line)) {
      scores.kakao_mobile += 15;
    }

    // LINE Features
    if (line.includes('LINE 저장한 날짜:') || line.includes('대화방 기록')) scores.line += 15;
    if (/^\d{4}\/\d{2}\/\d{2}\([^)]+\)/.test(line)) scores.line += 10; 
    if (/^\d{2}:\d{2}\t[^\t]+\t/.test(line)) scores.line += 15;
    if (/^\d{2}:\d{2}\s+\[[^\]]+\]/.test(line)) scores.line += 10;

    // Telegram Features
    if (/^\[\d{4}\.\s*\d{2}\.\s*\d{2}\s+\d{2}:\d{2}:\d{2}\]/.test(line)) scores.telegram += 15;
    if (/^\[\d{2}\.\s*\d{2}\.\s*\d{2}\s+\d{2}:\d{2}:\d{2}\]/.test(line)) scores.telegram += 12;
    if (/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]/.test(line)) scores.telegram += 12;

    // Naver Band Features
    if (line.includes('[대화내용]') || line.includes('밴드 대화방')) scores.band += 15;
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2},\s+.*:/.test(line)) scores.band += 15;

    // WhatsApp Features
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}\s+-\s+/.test(line)) scores.whatsapp += 15;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}\s+(AM|PM)\s+-\s+/.test(line)) scores.whatsapp += 15;
  }

  let maxFormat = 'kakao_pc';
  let maxScore = 0;
  for (const [format, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxFormat = format;
    }
  }

  return maxScore > 2 ? maxFormat : 'kakao_pc';
}

// ----------------------------------------------------
// Multi-Platform Chat Parser Engine
// ----------------------------------------------------
async function parseChatText(text, platform, filterSettings = {}, onChunkParsed) {
  const lines = text.split(/\r?\n/);
  const parsedLogs = [];
  
  let currentYear = 2026;
  let currentMonth = 1;
  let currentDate = 1;
  let currentDateStr = '2026-01-01';

  const CONFIG = {
    kakao_pc: {
      datePattern: /^-+\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*.*?-+$/,
      talkPattern: /^\[([^\]]+)\]\s+\[(오전|오후)\s+(\d{1,2}):(\d{2})\]\s+(.*)$/,
      joinPattern: /^(.*?)님이 들어왔습니다\./,
      leavePattern: /^(.*?)님이 나갔습니다\./,
      kickPattern: /^(.*?)님을 내보냈습니다\./,
      mediaKeywords: ['이모티콘', '사진', '동영상', '파일', '보이스톡']
    },
    kakao_mobile: {
      talkPattern1: /^(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일\s+(오전|오후)\s+(\d{1,2}):(\d{2}),\s+([^:]+)\s+:\s+(.*)$/,
      talkPattern2: /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s+(\d{1,2}):(\d{2}),\s+([^:]+)\s+:\s+(.*)$/,
      joinPattern: /님이 들어왔습니다\./,
      leavePattern: /님이 나갔습니다\./,
      kickPattern: /님을 내보냈습니다\./,
      mediaKeywords: ['이모티콘', '사진', '동영상', '파일', '보이스톡']
    },
    line: {
      datePattern: /^(\d{4})[\/\.](\d{2})[\/\.](\d{2})/,
      talkPattern1: /^(\d{2}):(\d{2})\t([^\t]+)\t(.*)$/,
      talkPattern2: /^(\d{2}):(\d{2})\s+\[([^\]]+)\]\s+(.*)$/,
      talkPattern3: /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})\s+([^:]+)\s+:\s+(.*)$/,
      joinPattern: /입장했습니다|들어왔습니다/,
      leavePattern: /퇴장했습니다|나갔습니다/,
      kickPattern: /내보냈습니다/,
      mediaKeywords: ['[이모티콘]', '[사진]', '[동영상]', '[파일]', '[Sticker]', '[Image]', '[Video]', '[File]']
    },
    telegram: {
      talkPattern: /^\[(\d{2,4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}):(\d{2}):\d{2}\]\s+([^:]+):\s+(.*)$/,
      joinPattern: /님이 방에 들어왔습니다\.|님이 들어왔습니다/,
      leavePattern: /님이 나갔습니다\./,
      kickPattern: /내보냈습니다/,
      mediaKeywords: ['[사진]', '[동영상]', '[파일]', '[이모티콘]', 'Sticker', 'Photo', 'Video', 'Voice message', 'Document']
    },
    band: {
      talkPattern: /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}),\s+([^:]+)\s+:\s+(.*)$/,
      joinPattern: /님이 가입했습니다\.|님이 들어왔습니다\./,
      leavePattern: /님이 탈퇴했습니다\.|님이 나갔습니다\./,
      kickPattern: /내보냈습니다/,
      mediaKeywords: ['[사진]', '[스티커]', '[동영상]', '[파일]', '[음성메시지]']
    },
    whatsapp: {
      talkPattern24: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s+-\s+([^:]+):\s+(.*)$/,
      talkPatternAmpm: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+-\s+([^:]+):\s+(.*)$/,
      joinPattern: /joined using an invite link|joined/i,
      leavePattern: /left/i,
      kickPattern: /removed/i,
      mediaKeywords: ['<Media omitted>', 'photo', 'video', 'sticker', 'document', 'audio']
    }
  };

  const activeConf = CONFIG[platform] || CONFIG.kakao_pc;
  
  // Date Boundary Settings
  const applyDateFilter = filterSettings.applyDateFilter || false;
  const startFilterMs = filterSettings.startDateMs || 0;
  const minLength = filterSettings.minLength || 0;

  const CHUNK_SIZE = 30000;
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && i % CHUNK_SIZE === 0) {
      if (onChunkParsed) {
        onChunkParsed(i, lines.length);
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const line = lines[i].trim();
    if (!line) continue;

    // A. Parse KakaoTalk PC
    if (platform === 'kakao_pc') {
      const dateMatch = line.match(activeConf.datePattern);
      if (dateMatch) {
        currentYear = parseInt(dateMatch[1]);
        currentMonth = parseInt(dateMatch[2]);
        currentDate = parseInt(dateMatch[3]);
        currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
        continue;
      }

      const talkMatch = line.match(activeConf.talkPattern);
      if (talkMatch) {
        const name = talkMatch[1];
        const ampm = talkMatch[2];
        let hour = parseInt(talkMatch[3]);
        const minute = parseInt(talkMatch[4]);
        let content = talkMatch[5];

        // Filter system/bot messages
        if (name === '방장봇') continue;

        if (ampm === '오후' && hour < 12) hour += 12;
        if (ampm === '오전' && hour === 12) hour = 0;
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const isMedia = activeConf.mediaKeywords.includes(content.trim());
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();

        // Check date boundary
        if (applyDateFilter && timestamp < startFilterMs) continue;

        // Check emoticon filter
        if (excludeEmojis && isEmoticonMessage(content, platform)) continue;

        // Check text length condition
        if (content.trim().length < minLength) continue;

        parsedLogs.push({
          date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
        });
        continue;
      }

      const joinMatch = line.match(activeConf.joinPattern);
      if (joinMatch) {
        const name = joinMatch[1];
        const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
        if (applyDateFilter && timestamp < startFilterMs) continue;
        parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
        continue;
      }

      const leaveMatch = line.match(activeConf.leavePattern) || line.match(activeConf.kickPattern);
      if (leaveMatch) {
        const name = leaveMatch[1];
        const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
        if (applyDateFilter && timestamp < startFilterMs) continue;
        const subtype = getLeaveSubtype(line);
        parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
        continue;
      }
    }

    // B. Parse KakaoTalk Mobile
    else if (platform === 'kakao_mobile') {
      const prefixMatch1 = line.match(/^(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일\s+(오전|오후)\s+(\d{1,2}):(\d{2}),\s+(.*)$/);
      const prefixMatch2 = line.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s+(\d{1,2}):(\d{2}),\s+(.*)$/);
      
      const prefixMatch = prefixMatch1 || prefixMatch2;
      if (prefixMatch) {
        currentYear = parseInt(prefixMatch[1]);
        currentMonth = parseInt(prefixMatch[2]);
        currentDate = parseInt(prefixMatch[3]);
        currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
        
        const ampm = prefixMatch[4];
        let hour = parseInt(prefixMatch[5]);
        const minute = parseInt(prefixMatch[6]);
        const rest = prefixMatch[7].trim();
        
        if (ampm === '오후' && hour < 12) hour += 12;
        if (ampm === '오전' && hour === 12) hour = 0;
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();
        
        const chatMatch = rest.match(/^([^:]+)\s+:\s+(.*)$/);
        if (chatMatch) {
          const name = chatMatch[1].trim();
          const content = chatMatch[2];
          
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.includes(content.trim());
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      } else {
        if (activeConf.joinPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
          }
          continue;
        }
        if (activeConf.leavePattern.test(line) || activeConf.kickPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            const subtype = getLeaveSubtype(line);
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
          }
          continue;
        }
      }
    }

    // C. Parse LINE
    else if (platform === 'line') {
      const dateMatch = line.match(activeConf.datePattern);
      if (dateMatch) {
        currentYear = parseInt(dateMatch[1]);
        currentMonth = parseInt(dateMatch[2]);
        currentDate = parseInt(dateMatch[3]);
        currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
        continue;
      }

      const lineMobileMatch = line.match(/^(\d{4})[\/\.](\d{2})[\/\.](\d{2})\s+(\d{2}):(\d{2})\s+(.*)$/);
      if (lineMobileMatch) {
        currentYear = parseInt(lineMobileMatch[1]);
        currentMonth = parseInt(lineMobileMatch[2]);
        currentDate = parseInt(lineMobileMatch[3]);
        currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
        
        const hour = parseInt(lineMobileMatch[4]);
        const minute = parseInt(lineMobileMatch[5]);
        const rest = lineMobileMatch[6].trim();
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();
        
        const chatMatch = rest.match(/^([^:]+)\s+:\s+(.*)$/);
        if (chatMatch) {
          const name = chatMatch[1].trim();
          const content = chatMatch[2];
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.some(kw => content.includes(kw));
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      }

      const lineTimeMatch1 = line.match(/^(\d{2}):(\d{2})\t(.*)$/);
      const lineTimeMatch2 = line.match(/^(\d{2}):(\d{2})\s+(.*)$/);
      const lineTimeMatch = lineTimeMatch1 || lineTimeMatch2;
      
      if (lineTimeMatch) {
        const hour = parseInt(lineTimeMatch[1]);
        const minute = parseInt(lineTimeMatch[2]);
        const rest = lineTimeMatch[3].trim();
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();
        
        let name = '';
        let content = '';
        let isChat = false;
        
        if (lineTimeMatch === lineTimeMatch1) {
          const parts = rest.split('\t');
          if (parts.length >= 2) {
            name = parts[0].trim();
            content = parts.slice(1).join('\t');
            isChat = true;
          }
        } else {
          const bracketMatch = rest.match(/^\[([^\]]+)\]\s+(.*)$/);
          if (bracketMatch) {
            name = bracketMatch[1].trim();
            content = bracketMatch[2];
            isChat = true;
          }
        }
        
        if (isChat) {
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.some(kw => content.includes(kw));
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      } else {
        if (activeConf.joinPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
          }
          continue;
        }
        if (activeConf.leavePattern.test(line) || activeConf.kickPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            const subtype = getLeaveSubtype(line);
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
          }
          continue;
        }
      }
    }

    // D. Parse Telegram
    else if (platform === 'telegram') {
      const telePrefixMatch = line.match(/^\[(\d{2,4})[\.\-]\s*(\d{2})[\.\-]\s*(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\]\s+(.*)$/);
      if (telePrefixMatch) {
        let yy = parseInt(telePrefixMatch[1]);
        if (yy < 100) yy += 2000;
        const mm = parseInt(telePrefixMatch[2]);
        const dd = parseInt(telePrefixMatch[3]);
        currentDateStr = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        
        const hour = parseInt(telePrefixMatch[4]);
        const minute = parseInt(telePrefixMatch[5]);
        const second = parseInt(telePrefixMatch[6]);
        const rest = telePrefixMatch[7].trim();
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:${String(second).padStart(2, '0')}`).getTime();
        
        const chatMatch = rest.match(/^([^:]+):\s+(.*)$/);
        if (chatMatch) {
          const name = chatMatch[1].trim();
          const content = chatMatch[2];
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.some(kw => content.includes(kw));
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      } else {
        if (activeConf.joinPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
          }
          continue;
        }
        if (activeConf.leavePattern.test(line) || activeConf.kickPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            const subtype = getLeaveSubtype(line);
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
          }
          continue;
        }
      }
    }

    // E. Parse Naver Band
    else if (platform === 'band') {
      const bandPrefixMatch = line.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}),\s+(.*)$/);
      if (bandPrefixMatch) {
        currentDateStr = `${bandPrefixMatch[1]}-${bandPrefixMatch[2]}-${bandPrefixMatch[3]}`;
        const hour = parseInt(bandPrefixMatch[4]);
        const minute = parseInt(bandPrefixMatch[5]);
        const rest = bandPrefixMatch[6].trim();
        
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();
        
        const chatMatch = rest.match(/^([^:]+)\s+:\s+(.*)$/);
        if (chatMatch) {
          const name = chatMatch[1].trim();
          const content = chatMatch[2];
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.some(kw => content.includes(kw));
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      } else {
        if (activeConf.joinPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
          }
          continue;
        }
        if (activeConf.leavePattern.test(line) || activeConf.kickPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            const subtype = getLeaveSubtype(line);
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
          }
          continue;
        }
      }
    }

    // F. Parse WhatsApp
    else if (platform === 'whatsapp') {
      const waPrefixMatch1 = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s+-\s+(.*)$/);
      const waPrefixMatch2 = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+-\s+(.*)$/);
      
      const waPrefixMatch = waPrefixMatch1 || waPrefixMatch2;
      if (waPrefixMatch) {
        const p1 = parseInt(waPrefixMatch[1]);
        const p2 = parseInt(waPrefixMatch[2]);
        const yy = parseInt(waPrefixMatch[3]);
        const hour = parseInt(waPrefixMatch[4]);
        const minute = parseInt(waPrefixMatch[5]);
        
        let ampm = '';
        let rest = '';
        if (waPrefixMatch === waPrefixMatch2) {
          ampm = waPrefixMatch[6];
          rest = waPrefixMatch[7].trim();
        } else {
          rest = waPrefixMatch[6].trim();
        }
        
        const yearStr = yy < 100 ? `20${yy}` : `${yy}`;
        let dateStr = '';
        if (p2 > 12) {
          dateStr = `${yearStr}-${String(p1).padStart(2,'0')}-${String(p2).padStart(2,'0')}`;
        } else {
          dateStr = `${yearStr}-${String(p2).padStart(2,'0')}-${String(p1).padStart(2,'0')}`;
        }
        currentDateStr = dateStr;
        
        let adjustedHour = hour;
        if (ampm) {
          if (ampm === 'PM' && hour < 12) adjustedHour += 12;
          if (ampm === 'AM' && hour === 12) adjustedHour = 0;
        }
        
        const timeStr = `${String(adjustedHour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
        const timestamp = new Date(`${currentDateStr}T${timeStr}:00`).getTime();
        
        const chatMatch = rest.match(/^([^:]+):\s+(.*)$/);
        if (chatMatch) {
          const name = chatMatch[1].trim();
          const content = chatMatch[2];
          if (name !== '방장봇') {
            const isMedia = activeConf.mediaKeywords.some(kw => content.includes(kw));
            if (!(applyDateFilter && timestamp < startFilterMs)) {
              if (!(excludeEmojis && isEmoticonMessage(content, platform))) {
                if (content.trim().length >= minLength) {
                  parsedLogs.push({
                    date: currentDateStr, nickname: name, timeStr: timeStr, type: 'talk', content: content, isMedia: isMedia, timestamp: timestamp
                  });
                }
              }
            }
          }
          continue;
        }
        
        if (activeConf.joinPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
            }
          }
          continue;
        }
        if (activeConf.leavePattern.test(rest) || activeConf.kickPattern.test(rest)) {
          const name = extractSystemName(rest);
          if (!(applyDateFilter && timestamp < startFilterMs)) {
            if (name && name.length < 30) {
              const subtype = getLeaveSubtype(rest);
              parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
            }
          }
          continue;
        }
      } else {
        if (activeConf.joinPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'join', timestamp: timestamp });
          }
          continue;
        }
        if (activeConf.leavePattern.test(line) || activeConf.kickPattern.test(line)) {
          const name = extractSystemName(line);
          const timestamp = new Date(`${currentDateStr}T00:00:00`).getTime();
          if (applyDateFilter && timestamp < startFilterMs) continue;
          if (name && name.length < 30) {
            const subtype = getLeaveSubtype(line);
            parsedLogs.push({ date: currentDateStr, nickname: name, type: 'leave', subtype: subtype, timestamp: timestamp });
          }
          continue;
        }
      }
    }

    // G. Multiline Text Append (Fallback logic)
    if (parsedLogs.length > 0 && parsedLogs[parsedLogs.length - 1].type === 'talk') {
      const prevLog = parsedLogs[parsedLogs.length - 1];
      prevLog.content += '\n' + line;
      prevLog.isMedia = false; 
    }
  }

  return parsedLogs;
}

// Processing stats based on parsed logs
function processStats() {
  activeUsers = {};
  
  // Pre-populate with all master users so they are NEVER excluded, even if they have 0 talks/events in the filtered period
  Object.values(masterUsers).forEach(mu => {
    activeUsers[mu.nickname] = {
      nickname: mu.nickname,
      totalTalks: 0,
      textCount: 0,
      mediaCount: 0,
      firstTalk: null,
      lastTalk: null,
      joinDates: [...mu.joinDates],
      leaveDates: [...mu.leaveDates],
      reenteredCount: Math.max(0, mu.joinDates.length - 1),
      talkDates: new Set(),
      hourlyTimeline: Array(24).fill(0), // hourly index 0-23
      lastStatus: mu.absoluteLastStatus, // Inherit absolute status
      absoluteFirstTalkDate: mu.absoluteFirstTalkDate,
      absoluteJoinDate: mu.absoluteJoinDate,
      absoluteLastTalkDate: mu.absoluteLastTalkDate,
      absoluteLastStatus: mu.absoluteLastStatus
    };
  });
  
  let totalMessages = 0;
  let totalMedia = 0;
  let periodDates = new Set();
  let totalJoins = 0;
  let totalLeaves = 0;

  chatLogs.forEach(log => {
    const name = log.nickname;
    if (name && purgedGhosts.has(name)) return; // Skip purged ghosts
    periodDates.add(log.date);

    if (!activeUsers[name]) {
      activeUsers[name] = {
        nickname: name,
        totalTalks: 0,
        textCount: 0,
        mediaCount: 0,
        firstTalk: null,
        lastTalk: null,
        joinDates: [],
        leaveDates: [],
        reenteredCount: 0,
        talkDates: new Set(),
        hourlyTimeline: Array(24).fill(0),
        lastStatus: 'none',
        absoluteFirstTalkDate: log.date,
        absoluteJoinDate: log.type === 'join' ? log.date : null,
        absoluteLastTalkDate: log.type === 'talk' ? log.date : null,
        absoluteLastStatus: log.type === 'join' ? 'join' : (log.type === 'leave' ? 'leave' : 'none')
      };
    }

    const u = activeUsers[name];

    if (log.type === 'talk') {
      u.lastStatus = 'talk';
      u.talkDates.add(log.date);
      totalMessages++;
      u.totalTalks++;
      if (log.isMedia) {
        totalMedia++;
        u.mediaCount++;
      } else {
        u.textCount++;
      }

      // First and last talk trackers
      if (!u.firstTalk || new Date(log.date) < new Date(u.firstTalk)) u.firstTalk = log.date;
      if (!u.lastTalk || new Date(log.date) > new Date(u.lastTalk)) u.lastTalk = log.date;

      // Hourly matrix tracker
      if (log.timeStr) {
        const hr = parseInt(log.timeStr.substring(0, 2));
        if (hr >= 0 && hr < 24) {
          u.hourlyTimeline[hr]++;
        }
      }
    } else if (log.type === 'join') {
      totalJoins++;
      u.lastStatus = 'join';
      if (!u.joinDates.includes(log.date)) {
        u.joinDates.push(log.date);
      }
      u.reenteredCount = Math.max(0, u.joinDates.length - 1);
    } else if (log.type === 'leave') {
      totalLeaves++;
      u.lastStatus = 'leave';
      if (!u.leaveDates.some(ld => ld.date === log.date)) {
        u.leaveDates.push({ date: log.date, subtype: log.subtype || '나감' });
      }
    }
  });

  const uniqueDates = Array.from(periodDates).sort();
  const dateCount = uniqueDates.length || 1;

  totalStats = {
    totalUsers: Object.keys(activeUsers).length,
    totalMessages: totalMessages,
    mediaRatio: totalMessages > 0 ? ((totalMedia / totalMessages) * 100).toFixed(1) : 0,
    mediaCount: totalMedia,
    totalDays: dateCount,
    startDate: uniqueDates[0] || '-',
    endDate: uniqueDates[uniqueDates.length - 1] || '-',
    avgDailyMessages: (totalMessages / dateCount).toFixed(1),
    allUniqueDates: uniqueDates,
    totalJoins: totalJoins,
    totalLeaves: totalLeaves
  };
}

// Controller logic for analysis execution
async function startAnalysis() {
  if (window.isOfflineReport && window.offlineData) {
    const applyDateFilter = chkStartDate.checked;
    const startFilterDateVal = inputStartDate.value;
    const startFilterMs = startFilterDateVal ? new Date(`${startFilterDateVal}T00:00:00`).getTime() : 0;

    chatLogs = window.offlineData.chatLogs.filter(log => {
      if (applyDateFilter && log.timestamp < startFilterMs) return false;
      return true;
    });

    processStats();
    renderDashboard();
    return;
  }

  if (!rawChatText) return;

  // Read analysis conditions
  const applyDateFilter = chkStartDate.checked;
  const startFilterDateVal = inputStartDate.value;
  const minLength = parseInt(selectChatCondition.value);

  const filterSettings = {
    applyDateFilter: applyDateFilter,
    startDateMs: startFilterDateVal ? new Date(`${startFilterDateVal}T00:00:00`).getTime() : 0,
    minLength: minLength
  };

  // If cache is empty, we must parse the text asynchronously (first-time parse)
  const isFirstTime = (cachedAllLogsRaw.length === 0);
  if (isFirstTime) {
    showLoadingModal('대화 기록을 읽고 분석하는 중입니다...');
    cachedAllLogsRaw = await parseChatText(rawChatText, detectedPlatform, { applyDateFilter: false, minLength: 0 }, (current, total) => {
      const pct = Math.round((current / total) * 100);
      if (loadingStatusEl) {
        loadingStatusEl.innerText = `대화 기록을 읽어오는 중입니다... (${pct}%)`;
      }
    });
  } else {
    // If not first time, show loading modal briefly for UX feedback
    showLoadingModal('설정된 필터 조건으로 통계를 재계산하고 있습니다...');
    await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for feedback
  }

  // Ensure all logs are classified and tags are pre-scanned
  const unclassifiedLogs = cachedAllLogsRaw.filter(log => log.type === 'talk' && log.content && !log.category);
  if (unclassifiedLogs.length > 0) {
    if (loadingStatusEl) loadingStatusEl.innerText = '대화 주제 및 키워드를 분석하고 분류하고 있습니다... (0%)';
    await new Promise(resolve => setTimeout(resolve, 10)); // Yield to paint
    
    let defaultCat = 'ETC';
    let defaultSub = 'UNCLASSIFIED';
    if (TAXONOMY.length > 0) {
      const lastCat = TAXONOMY.find(c => c.id === 'ETC') || TAXONOMY[TAXONOMY.length - 1];
      defaultCat = lastCat.id;
      const lastSub = lastCat.subs.find(s => s.id === 'UNCLASSIFIED') || lastCat.subs[0];
      defaultSub = lastSub ? lastSub.id : '';
    }

    // Pre-lower tags in TAXONOMY once to avoid repeated toLowerCase() calls
    const preparedTaxonomy = TAXONOMY.map(cat => ({
      id: cat.id,
      subs: cat.subs.map(sub => ({
        id: sub.id,
        tags: sub.tags,
        lowerTags: sub.tags.map(t => t.toLowerCase())
      }))
    }));

    const CHUNK_SIZE = 5000;
    for (let idx = 0; idx < unclassifiedLogs.length; idx += CHUNK_SIZE) {
      const chunk = unclassifiedLogs.slice(idx, idx + CHUNK_SIZE);
      chunk.forEach(log => {
        const lowerContent = log.content.toLowerCase();
        const matched = [];
        let bestCat = defaultCat;
        let bestSub = defaultSub;
        let bestScore = 0;

        for (let i = 0; i < preparedTaxonomy.length; i++) {
          const cat = preparedTaxonomy[i];
          for (let j = 0; j < cat.subs.length; j++) {
            const sub = cat.subs[j];
            let subScore = 0;
            for (let k = 0; k < sub.lowerTags.length; k++) {
              if (lowerContent.includes(sub.lowerTags[k])) {
                subScore++;
                matched.push(sub.tags[k]);
              }
            }
            if (subScore > bestScore) {
              bestScore = subScore;
              bestCat = cat.id;
              bestSub = sub.id;
            }
          }
        }

        log.matchedTags = matched;
        log.category = bestCat;
        log.subcategory = bestSub;
      });

      const processed = Math.min(idx + CHUNK_SIZE, unclassifiedLogs.length);
      const pct = Math.round((processed / unclassifiedLogs.length) * 100);
      if (loadingStatusEl) {
        loadingStatusEl.innerText = `대화 주제 및 키워드를 분석하고 분류하고 있습니다... (${pct}%)`;
      }
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to paint progress
    }
  }

  // 1) Discover master users across absolute history
  masterUsers = {};
  const allLogsRaw = cachedAllLogsRaw;
  
  // Compute absolute start date of entire chat log
  absoluteStartDate = '-';
  if (allLogsRaw.length > 0) {
    const allDates = allLogsRaw.map(l => l.date).filter(Boolean);
    if (allDates.length > 0) {
      allDates.sort();
      absoluteStartDate = allDates[0];
    }
  }

  if (loadingStatusEl) loadingStatusEl.innerText = '대화 참여 인원 정보를 집계하고 있습니다...';
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to paint

  allLogsRaw.forEach(log => {
    const name = log.nickname;
    if (!name) return;
    if (purgedGhosts.has(name)) return; // Skip purged ghosts
    
    if (!masterUsers[name]) {
      masterUsers[name] = {
        nickname: name,
        absoluteFirstTalkDate: null,
        absoluteJoinDate: null,
        absoluteLastTalkDate: null,
        absoluteLastStatus: 'none',
        joinDates: [],
        leaveDates: [],
        oldNicknames: [] // For nickname change detection
      };
    }
    const mu = masterUsers[name];
    if (log.type === 'talk') {
      mu.absoluteLastStatus = 'talk';
      if (!mu.absoluteFirstTalkDate) mu.absoluteFirstTalkDate = log.date;
      mu.absoluteLastTalkDate = log.date;
    } else if (log.type === 'join') {
      if (!mu.absoluteJoinDate) mu.absoluteJoinDate = log.date;
      mu.absoluteLastStatus = 'join';
      // Prevent duplicate joinDates
      if (!mu.joinDates.includes(log.date)) {
        mu.joinDates.push(log.date);
      }
    } else if (log.type === 'leave') {
      mu.absoluteLastStatus = 'leave';
      // Prevent duplicate leaveDates
      if (!mu.leaveDates.some(ld => ld.date === log.date)) {
        mu.leaveDates.push({ date: log.date, subtype: log.subtype || '나감' });
      }
    }
  });

  if (loadingStatusEl) loadingStatusEl.innerText = '필터 조건에 맞는 대화 기록을 추출하고 있습니다...';
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to paint

  // 2) Filter chat logs in-memory
  chatLogs = allLogsRaw.filter(log => {
    if (log.type === 'talk') {
      if (filterSettings.applyDateFilter && log.timestamp < filterSettings.startDateMs) return false;
      if (excludeEmojis && isEmoticonMessage(log.content, detectedPlatform)) return false;
      if (log.content.trim().length < filterSettings.minLength) return false;
    } else {
      if (filterSettings.applyDateFilter && log.timestamp < filterSettings.startDateMs) return false;
    }
    return true;
  });

  if (chatLogs.length === 0) {
    hideLoadingModal();
    alert('설정한 시작 날짜 또는 조건 필터 범위 내에서 유효한 대화방 로그를 발견할 수 없었습니다.');
    return;
  }

  if (loadingStatusEl) loadingStatusEl.innerText = '통계 지표를 연산하고 있습니다...';
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to paint

  processStats();

  // 3) Detect and merge nickname changes (e.g. "불나게일하는공2" → "불나게일하는공3")
  const nicknameChanges = detectNicknameChanges(allLogsRaw);
  if (nicknameChanges.length > 0) {
    applyNicknameMerges(nicknameChanges);
    console.log(`[ToriChat] 닉네임 변경 감지: ${nicknameChanges.length}건 병합 완료`, nicknameChanges);
  }

  if (loadingStatusEl) loadingStatusEl.innerText = '대시보드와 차트를 그리는 중입니다...';
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to paint

  renderDashboard();
  
  hideLoadingModal();
}


// Render Dashboard Data & Charts
function renderDashboard() {
  dashboardContent.style.display = 'grid';

  // Compute ghost/dormant metrics
  calculateGhostMetrics();

  // Set Summary statistics
  const cumulativeTotal = Object.keys(activeUsers).length;
  const currentFiltered = getFilteredUsers().length;
  if (hideLeavers || protectReentrants) {
    summaryChatters.innerText = `${currentFiltered.toLocaleString()}명 (누적 ${cumulativeTotal.toLocaleString()}명)`;
  } else {
    summaryChatters.innerText = cumulativeTotal.toLocaleString() + '명';
  }
  summaryChats.innerText = totalStats.totalMessages.toLocaleString();
  summaryLeaves.innerText = totalStats.totalLeaves.toLocaleString();
  summaryJoins.innerText = totalStats.totalJoins.toLocaleString();

  // Reset filtering presets dynamically based on actual dates parsed
  periodRangeDisplay.innerText = `${totalStats.startDate} ~ ${totalStats.endDate} (데이터 수집 범위)`;

  // Render tab contents
  renderTabContent();

  // Populate chart member selection dropdown
  populateChartMemberSelect();

  // Run candidate user filter initially
  runTargetFiltering();

  // Always render charts so they are initialized and ready for printing/downloading
  renderUserRatioChart();
  updateTimeSeriesChart();
  renderHourlyActivityChart();
  renderWeeklyActivityChart();
  renderTopicDistributionChart();

  // Scroll smoothly to dashboard
  dashboardContent.scrollIntoView({ behavior: 'smooth' });
}

// ----------------------------------------------------
// Ghost (눈팅족) Member Calculation Algorithm
// ----------------------------------------------------
function calculateGhostMetrics() {
  const inputCap = parseInt(inputActualMembers.value) || 0;
  const dormancyThreshold = selectDormancy.value; // 'none', '1w', '2w', ...
  
  let criteriaDays = 0;
  if (dormancyThreshold !== 'none' && dormancyThreshold.endsWith('w')) {
    criteriaDays = parseInt(dormancyThreshold) * 7;
  }

  const lastRoomDate = new Date(totalStats.endDate);

  // We only count current members (those who have not left the room)
  const currentMembers = [];
  Object.values(activeUsers).forEach(u => {
    // Exclude leavers from current members, BUT protect re-entrants if toggle is ON
    if (u.lastStatus === 'leave') {
      if (protectReentrants && isReentrantInRoom(u)) {
        // Re-entrant protection: treat as current member despite lastStatus
        currentMembers.push(u);
      }
      return;
    }
    currentMembers.push(u);
  });

  let activeChatterCount = 0;
  let dormantCount = 0;
  let identifiedGhostCount = 0;

  currentMembers.forEach(u => {
    u.isGhostOfGhost = false;
    u.isDormant = false;

    if (u.totalTalks > 0) {
      if (criteriaDays > 0 && u.lastTalk) {
        const elapsed = Math.ceil((lastRoomDate - new Date(u.lastTalk)) / (24 * 60 * 60 * 1000));
        if (elapsed > criteriaDays) {
          u.isDormant = true;
          dormantCount++;
        } else {
          activeChatterCount++;
        }
      } else {
        activeChatterCount++;
      }
    } else {
      // u.totalTalks === 0
      // Redefined: No talks in the analyzed period and no leave record ever -> Ghost of Ghost
      if (u.leaveDates.length === 0) {
        u.isGhostOfGhost = true;
        identifiedGhostCount++;
      } else {
        // Has a leave record and 0 talks in the period -> Dormant
        u.isDormant = true;
        dormantCount++;
      }
    }
  });

  // Calculate unseen ghost members
  const parsedCurrentCount = currentMembers.length;
  const effectiveCap = Math.max(inputCap, parsedCurrentCount);
  
  let unseenGhostCount = 0;
  if (effectiveCap > parsedCurrentCount) {
    unseenGhostCount = effectiveCap - parsedCurrentCount;
  }

  const totalGhostCount = identifiedGhostCount + unseenGhostCount;

  // Update DOM Board
  ghostCapacityEl.innerText = inputCap > 0 ? inputCap + '명' : '-';
  ghostActiveEl.innerText = activeChatterCount + '명';
  
  if (criteriaDays > 0) {
    ghostDormantEl.innerText = dormantCount + '명';
    ghostDormantCriteriaEl.innerText = selectDormancy.options[selectDormancy.selectedIndex].text;
  } else {
    ghostDormantEl.innerText = '-';
    ghostDormantCriteriaEl.innerText = '설정안함';
  }

  // Display ghost count formatted as X명 (총 Y명 대비 P%) - Linebreak added
  if (inputCap > 0) {
    const pct = ((totalGhostCount / inputCap) * 100).toFixed(1);
    ghostGhostEl.innerHTML = `${totalGhostCount}명<br><span class="card-detail-sub">(총 ${inputCap}명 대비 ${pct}%)</span>`;
  } else {
    ghostGhostEl.innerText = totalGhostCount + '명';
  }

  if (inputCap > 0) {
    const silentRatio = (((dormantCount + totalGhostCount) / inputCap) * 100).toFixed(1);
    ghostRateEl.innerText = Math.min(100.0, parseFloat(silentRatio)).toFixed(1) + '%';
  } else {
    ghostRateEl.innerText = '-';
  }

  // Ghost of Ghost warning UI alert in advanced charts panel
  const chartGhostWarningEl = document.getElementById('chart-ghost-warning');
  const chartGhostWarningTextEl = document.getElementById('chart-ghost-warning-text');
  if (chartGhostWarningEl && chartGhostWarningTextEl) {
    if (identifiedGhostCount > 0) {
      chartGhostWarningTextEl.innerText = `안내: 대화 및 퇴장 기록이 없는 Ghost of Ghost 유령 회원(${identifiedGhostCount}명)은 활동성 통계 차트 및 요일/시간대별 활성도 산정에서 제외되었습니다.`;
      chartGhostWarningEl.style.display = 'flex';
    } else {
      chartGhostWarningEl.style.display = 'none';
    }
  }
}

// Toggle Leavers visibility
function toggleLeaversVisibility() {
  hideLeavers = !hideLeavers;
  if (hideLeavers) {
    btnRemoveLeavers.classList.add('active');
  } else {
    btnRemoveLeavers.classList.remove('active');
  }
  
  // Recalculate and render
  calculateGhostMetrics();
  renderTabContent();

  // Refresh chart member dropdown and refresh all charts
  populateChartMemberSelect();
  updateTimeSeriesChart();
  renderUserRatioChart();
  renderHourlyActivityChart();
  renderWeeklyActivityChart();
  renderTopicDistributionChart();

  // Refresh candidate filters list
  runTargetFiltering();
}

// Populate chart member selection dropdown
function populateChartMemberSelect() {
  const selectEl = document.getElementById('chart-member-select');
  if (!selectEl) return;

  const currentVal = selectEl.value;

  selectEl.innerHTML = '<option value="all">전체 (단톡방 전체)</option>';

  const sortedUsers = getFilteredUsers()
    .sort((a, b) => b.totalTalks - a.totalTalks);

  sortedUsers.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.nickname;
    const alias = (u.oldNicknames && u.oldNicknames.length > 0) ? ` [변경 전: ${u.oldNicknames.join(',')}]` : '';
    opt.innerText = `${u.nickname}${alias} (${u.totalTalks}회)`;
    selectEl.appendChild(opt);
  });

  if (Array.from(selectEl.options).some(opt => opt.value === currentVal)) {
    selectEl.value = currentVal;
  } else {
    selectEl.value = 'all';
  }
}

// ----------------------------------------------------
// Tab Router / Renderer
// ----------------------------------------------------
function renderTabContent() {
  const query = searchUsernameInput.value.toLowerCase();
  
  // Apply filters
  let filteredList = Object.values(activeUsers).filter(u => 
    u.nickname.toLowerCase().includes(query)
  );

  // Filter leavers out if toggled (with re-entrant protection)
  if (hideLeavers) {
    filteredList = filteredList.filter(u => {
      if (u.lastStatus !== 'leave') return true;
      // If protection is ON and this user is a same-person re-entrant, keep them
      if (protectReentrants && isReentrantInRoom(u)) return true;
      return false;
    });
  }

  if (activeTab === 'tab-users') {
    renderUsersTab(filteredList);
  } else if (activeTab === 'tab-hourly') {
    renderHourlyTab(filteredList);
  } else if (activeTab === 'tab-raw') {
    renderRawChatsTab();
  }

  // Always sync bottom summary: filtered count + cumulative total
  const _cumTotal = Object.keys(activeUsers).length;
  const _filtCount = filteredList.length;
  if (hideLeavers || protectReentrants) {
    summaryChatters.innerText = `${_filtCount.toLocaleString()}명 (누적 ${_cumTotal.toLocaleString()}명)`;
  } else {
    summaryChatters.innerText = _cumTotal.toLocaleString() + '명';
  }
}

// Render Tab 1: By User
function renderUsersTab(users) {
  usersTableBody.innerHTML = '';

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">검색 조건에 맞는 참여자가 없습니다.</td></tr>`;
    return;
  }

  // ---- Build similarity warning map ----
  // Find current-member ↔ leaver pairs with similar names to warn the user
  const allLeavers = Object.values(activeUsers).filter(u => u.lastStatus === 'leave');
  const warningMap = {}; // { currentNickname: [ { nickname, leaveDates } ] }

  users.forEach(cu => {
    if (cu.lastStatus === 'leave') return; // Skip leavers already in list
    allLeavers.forEach(leaver => {
      if (leaver.nickname === cu.nickname) return;
      // Skip if this leaver is also in the current display list
      if (users.some(u => u.nickname === leaver.nickname)) return;
      if (areNamesSimilar(cu.nickname, leaver.nickname)) {
        if (!warningMap[cu.nickname]) warningMap[cu.nickname] = [];
        if (!warningMap[cu.nickname].find(l => l.nickname === leaver.nickname)) {
          warningMap[cu.nickname].push({ nickname: leaver.nickname, leaveDates: leaver.leaveDates });
        }
      }
    });
  });

  // ---- Sort: place warning-flagged users adjacent to their similar-named leaver ----
  // Group: [normal users...], then [warning user + its similar leaver rows if leaver in list]
  const sortedForDisplay = [];
  const seenInDisplay = new Set();

  users.forEach(u => {
    if (seenInDisplay.has(u.nickname)) return;
    seenInDisplay.add(u.nickname);
    sortedForDisplay.push({ user: u, isWarningRow: false });

    // If a similar-named leaver is ALSO in the display list, insert them immediately after
    if (warningMap[u.nickname]) {
      warningMap[u.nickname].forEach(leaverInfo => {
        const leaverInList = users.find(lu => lu.nickname === leaverInfo.nickname);
        if (leaverInList && !seenInDisplay.has(leaverInfo.nickname)) {
          seenInDisplay.add(leaverInfo.nickname);
          sortedForDisplay.push({ user: leaverInList, isWarningRow: true, pairedWith: u.nickname });
        }
      });
    }
  });

  // ---- Render rows ----
  sortedForDisplay.forEach(({ user: u, isWarningRow, pairedWith }) => {
    const tr = document.createElement('tr');
    tr.classList.add('fade-in-row');

    if (u.isDormant || u.isGhostOfGhost || u.totalTalks === 0) tr.classList.add('dormant-row');
    if (isWarningRow) tr.classList.add('similarity-warning-row');

    const share = totalStats.totalMessages > 0 ? ((u.totalTalks / totalStats.totalMessages) * 100).toFixed(1) : 0;

    // Join dates display — always show all
    const entryLabel = `[횟수: ${u.joinDates.length}] ${u.joinDates.map(d => formatKoreanDate(d)).join(', ') || '-'}`;
    const exitLabel = u.leaveDates.length > 0
      ? `[횟수: ${u.leaveDates.length}] ${u.leaveDates.map(l => `${formatKoreanDate(l.date)}=>${l.subtype}`).join(', ')}`
      : '-';

    // Status badges
    let badgeHtml = '';
    const isCurrentLeaver = u.lastStatus === 'leave';
    const isProtectedReentrant = protectReentrants && isReentrantInRoom(u);

    if (isCurrentLeaver && !isProtectedReentrant) {
      badgeHtml = `<span class="dormant-badge leaver-badge"><i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i> 퇴장</span>`;
    } else if (isProtectedReentrant) {
      badgeHtml = `<span class="dormant-badge reentrant-protected"><i class="fa-solid fa-rotate-right"></i> 재입장 보호</span>`;
    } else if (u.isGhostOfGhost) {
      badgeHtml = `<span class="dormant-badge ghost-of-ghost"><i class="fa-solid fa-ghost"></i> Ghost of Ghost</span>`;
    } else if (u.isDormant) {
      badgeHtml = `<span class="dormant-badge dormant-member"><i class="fa-solid fa-hourglass-half"></i> 잠수</span>`;
    }

    // Similarity warning badge
    const similarLeavers = warningMap[u.nickname];
    let similarWarnHtml = '';
    if (similarLeavers && similarLeavers.length > 0 && !isCurrentLeaver) {
      const names = similarLeavers.map(l => escapeHtml(l.nickname)).join(', ');
      similarWarnHtml = `<span class="similar-name-warn" title="이름이 유사한 퇴장자: ${names}">⚠️ 유사 닉네임 퇴장자 존재</span>`;
    }
    if (isWarningRow) {
      similarWarnHtml += `<span class="similar-name-warn similar-pair-indicator" title="${escapeHtml(pairedWith || '')}과(와) 이름 유사">🔗 유사 닉네임 페어</span>`;
    }

    // Display name construction
    let displayName = escapeHtml(u.nickname);
    if (u.oldNicknames && u.oldNicknames.length > 0) {
      displayName += ` <span class="prev-nickname-tag">(변경 전: ${u.oldNicknames.map(escapeHtml).join(', ')})</span>`;
    }
    if (isCurrentLeaver) {
      displayName += ' <span class="leave-tag">(퇴장한 회원)</span>';
    }

    tr.innerHTML = `
      <td data-label="닉네임">
        <strong class="highlight">${displayName}</strong>
        ${badgeHtml}
        ${similarWarnHtml}
      </td>
      <td data-label="최초 입장일">${formatKoreanDate(u.joinDates[0] || u.absoluteJoinDate || u.absoluteFirstTalkDate || absoluteStartDate) || '-'}</td>
      <td data-label="입장 내역">${entryLabel}</td>
      <td data-label="퇴장 내역">${exitLabel}</td>
      <td data-label="마지막 대화일" class="${(u.isDormant || u.totalTalks === 0 || isCurrentLeaver) ? 'dormant-tag-txt' : ''}">${u.totalTalks > 0 ? formatKoreanDate(u.lastTalk) : '대화 없음'}</td>
      <td data-label="총 대화수"><strong>${u.totalTalks.toLocaleString()}</strong></td>
      <td data-label="점유율">${share}%</td>
    `;
    usersTableBody.appendChild(tr);
  });
}


// Render Tab 2: Hourly timeline grid (Heatmap styled)
function renderHourlyTab(users) {
  hourlyTableBody.innerHTML = '';

  if (users.length === 0) {
    hourlyTableBody.innerHTML = `<tr><td colspan="26" class="empty-row">검색 조건에 맞는 참여자가 없습니다.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');
    
    let tds = `<td class="sticky-col"><strong class="highlight">${escapeHtml(u.nickname)}</strong></td>`;
    tds += `<td><strong>${u.totalTalks.toLocaleString()}</strong></td>`;
    
    // Generate 24 hourly columns with heatmap background styling
    for (let i = 0; i < 24; i++) {
      const cnt = u.hourlyTimeline[i] || 0;
      let style = '';
      
      if (cnt > 0) {
        let opacity = 0.15;
        if (cnt > 50) opacity = 0.85;
        else if (cnt > 20) opacity = 0.6;
        else if (cnt > 5) opacity = 0.35;
        
        style = `style="background: rgba(79, 172, 254, ${opacity}); color: ${opacity > 0.5 ? '#000' : '#fff'};"`;
      }
      
      tds += `<td class="hourly-cell" ${style}>${cnt}</td>`;
    }

    tr.innerHTML = tds;
    hourlyTableBody.appendChild(tr);
  });
}

// Render Tab 3: Raw Logs View
function renderRawChatsTab() {
  rawChatsViewer.innerHTML = '';
  
  if (window.isOfflineReport) {
    rawChatsViewer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fa-solid fa-shield-halved" style="font-size:48px; color:var(--primary); margin-bottom:16px;"></i><br>보안 및 위변조 방지를 위해 대화 원본 텍스트는 이 리포트 파일에 포함되지 않습니다.</div>';
    return;
  }

  if (chatLogs.length === 0) {
    rawChatsViewer.innerHTML = '<div class="empty-row">출력할 대화 기록이 존재하지 않습니다.</div>';
    return;
  }

  let lastRenderedDate = '';
  const fragment = document.createDocumentFragment();

  // Print chronological logs with custom wrapper tags
  chatLogs.forEach(log => {
    // Check Date header separator
    if (log.date !== lastRenderedDate) {
      lastRenderedDate = log.date;
      const dateSep = document.createElement('div');
      dateSep.className = 'raw-chat-date-sep';
      dateSep.innerText = `--------------- ${log.date} ---------------`;
      fragment.appendChild(dateSep);
    }

    if (log.type === 'talk') {
      const line = document.createElement('div');
      line.className = 'raw-chat-line';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'time';
      timeSpan.innerText = `[${log.timeStr}]`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'name';
      nameSpan.innerText = `[${escapeHtml(log.nickname)}] `;

      const contentSpan = document.createElement('span');
      contentSpan.className = 'content';
      contentSpan.innerText = log.content;

      line.appendChild(nameSpan);
      line.appendChild(timeSpan);
      line.appendChild(contentSpan);
      fragment.appendChild(line);
    } else {
      // System message joins or leaves
      const sysLine = document.createElement('div');
      sysLine.className = 'raw-chat-system';
      const actionTxt = log.type === 'join' ? '님이 들어왔습니다.' : '님이 나갔습니다.';
      sysLine.innerText = `${log.nickname}${actionTxt}`;
      fragment.appendChild(sysLine);
    }
  });

  rawChatsViewer.appendChild(fragment);
}

// ----------------------------------------------------
// Global Table Sorting Function
// ----------------------------------------------------
function sortTable(columnIndex) {
  const table = document.getElementById("users-table");
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  
  if (rows.length === 0 || rows[0].querySelector(".empty-row")) return;

  const direction = sortDirection[columnIndex] === 'asc' ? 'desc' : 'asc';
  sortDirection[columnIndex] = direction;

  // Visual indicators update
  const headers = table.querySelectorAll("th");
  headers.forEach((h, idx) => {
    const icon = h.querySelector("i");
    if (idx === columnIndex) {
      icon.className = direction === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
      icon.style.color = "var(--primary)";
    } else {
      icon.className = "fa-solid fa-sort";
      icon.style.color = "";
    }
  });

  const sortedRows = rows.sort((a, b) => {
    let aVal = a.cells[columnIndex].innerText.trim();
    let bVal = b.cells[columnIndex].innerText.trim();

    // Remove badge tags if present
    if (columnIndex === 0) {
      aVal = aVal.replace("잠수", "").trim();
      bVal = bVal.replace("잠수", "").trim();
    }

    // Date comparisons for columns 1, 2, 3, 4
    if (columnIndex >= 1 && columnIndex <= 4) {
      const dateA = parseKoreanDate(aVal);
      const dateB = parseKoreanDate(bVal);
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // Number comparisons for Chat counts and Share
    if (columnIndex === 5) {
      return direction === 'asc' ? 
        parseInt(aVal.replace(/,/g, '')) - parseInt(bVal.replace(/,/g, '')) : 
        parseInt(bVal.replace(/,/g, '')) - parseInt(aVal.replace(/,/g, ''));
    }
    if (columnIndex === 6) {
      const aPct = parseFloat(aVal.split('%')[0]);
      const bPct = parseFloat(bVal.split('%')[0]);
      return direction === 'asc' ? aPct - bPct : bPct - aPct;
    }

    // Alphabetical fallback
    return direction === 'asc' ? 
      aVal.localeCompare(bVal, 'ko') : 
      bVal.localeCompare(aVal, 'ko');
  });

  tbody.innerHTML = '';
  sortedRows.forEach(row => tbody.appendChild(row));
}

// User Rank Modal logic
function showRankModal() {
  const modalBody = modalUsersBody;
  modalBody.innerHTML = '';
  usersModal.style.display = 'flex';

  const sortedUsers = getFilteredUsers().sort((a, b) => b.totalTalks - a.totalTalks);

  sortedUsers.forEach((u, index) => {
    const tr = document.createElement('tr');
    const pct = totalStats.totalMessages > 0 ? ((u.totalTalks / totalStats.totalMessages) * 100).toFixed(1) : 0;
    const prevNicknameHtml = (u.oldNicknames && u.oldNicknames.length > 0)
      ? ` <span class="prev-nickname-tag">(변경 전: ${u.oldNicknames.map(escapeHtml).join(', ')})</span>`
      : '';
    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td><strong class="highlight">${escapeHtml(u.nickname)}</strong>${prevNicknameHtml}</td>
      <td><strong>${u.totalTalks.toLocaleString()}</strong></td>
      <td>${u.textCount.toLocaleString()}</td>
      <td>${u.mediaCount.toLocaleString()}</td>
      <td>${pct}%</td>
    `;
    modalBody.appendChild(tr);
  });
}

// Show Filtered Target Users Modal
function showFilteredModal() {
  modalFilteredUsersBody.innerHTML = '';
  filteredUsersModal.style.display = 'flex';

  const targetUsers = window.lastFilteredUsers || [];

  if (targetUsers.length === 0) {
    modalFilteredUsersBody.innerHTML = `<tr><td colspan="5" class="empty-row">추출 조건에 부합하는 대상자가 없습니다.</td></tr>`;
  } else {
    targetUsers.forEach(cu => {
      const tr = document.createElement('tr');
      tr.classList.add('fade-in-row');
      
      let nicknameDisplay = cu.nickname;
      const userObj = activeUsers[cu.nickname];
      if (userObj && userObj.lastStatus === 'leave') {
        nicknameDisplay += ' (퇴장한 회원)';
      }
      
      tr.innerHTML = `
        <td><strong class="highlight">${escapeHtml(nicknameDisplay)}</strong></td>
        <td><strong>${cu.periodTalks}회</strong></td>
        <td>${cu.maxDormant === 9999 ? '-' : cu.maxDormant + '일'}</td>
        <td>${cu.elapsedDays === 9999 ? '-' : cu.elapsedDays + '일 경과'}</td>
        <td>${cu.lastTalk === '-' || !cu.lastTalk ? '대화 없음' : formatKoreanDate(cu.lastTalk)}</td>
      `;
      modalFilteredUsersBody.appendChild(tr);
    });
  }
}

// ----------------------------------------------------
// SheetJS Tab-specific Excel Exporter Logic
// ----------------------------------------------------
function exportExcelByTab() {
  if (Object.keys(activeUsers).length === 0) {
    alert('분석된 대화 데이터가 없습니다.');
    return;
  }

  const wb = XLSX.utils.book_new();

  if (activeTab === 'tab-users') {
    // 1. Export User data list — synced with current filters
    const dataRows = getFilteredUsers().map(u => {
      const rate = totalStats.totalMessages > 0 ? 
        ((u.totalTalks / totalStats.totalMessages) * 100).toFixed(1) : 0;
      
      const nicknameCell = (u.oldNicknames && u.oldNicknames.length > 0)
        ? `${u.nickname} (변경 전: ${u.oldNicknames.join(', ')})`
        : u.nickname;
      const statusLabel = u.lastStatus === 'leave' ? '퇴장한 회원' : (u.isDormant ? '잠수' : '활동');
      
      return {
        '닉네임': nicknameCell,
        '현재상태': statusLabel,
        '최초 입장일': u.joinDates[0] || '-',
        '입장이력': u.joinDates.join(', ') || '-',
        '재입장횟수': u.reenteredCount,
        '퇴장이력': u.leaveDates.map(l => `${l.date}=>${l.subtype}`).join(', ') || '-',
        '마지막 대화일': u.lastTalk || '-',
        '총 대화수': u.totalTalks,
        '대화 점유율 (%)': parseFloat(rate)
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "사용자별 대화분석");
    XLSX.writeFile(wb, "ToriChat_User_Report.xlsx");
  } 
  
  else if (activeTab === 'tab-hourly') {
    // 2. Export 24h Hourly grid matrix — synced with current filters
    const dataRows = getFilteredUsers().map(u => {
      const nicknameCell = (u.oldNicknames && u.oldNicknames.length > 0)
        ? `${u.nickname} (변경 전: ${u.oldNicknames.join(', ')})`
        : u.nickname;
      const row = {
        '닉네임': nicknameCell,
        '총대화수': u.totalTalks
      };
      
      for (let i = 0; i < 24; i++) {
        row[`${i}시`] = u.hourlyTimeline[i] || 0;
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "시간대별 대화량");
    XLSX.writeFile(wb, "ToriChat_Hourly_Timeline.xlsx");
  } 
  
  else {
    // 3. Export Raw chats
    const dataRows = chatLogs.map(log => ({
      '날짜': log.date,
      '타입': log.type === 'talk' ? '대화' : (log.type === 'join' ? '입장' : '퇴장'),
      '닉네임': log.nickname,
      '시간': log.timeStr || '-',
      '내용': log.content || (log.type === 'join' ? '입장했습니다.' : '나갔습니다.')
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, "전체 대화 원본");
    XLSX.writeFile(wb, "ToriChat_Raw_Conversations.xlsx");
  }
}

// ----------------------------------------------------
// Target User Filter & Candidate Selection Algorithm
// ----------------------------------------------------
function runTargetFiltering() {
  const thresholdTalks = parseInt(filterLowActivity.value);
  const minDormantDays = parseInt(filterDormantDays.value);
  const minElapsedDays = parseInt(filterElapsedDays.value);
  const periodPreset = filterPeriodPreset.value;

  const tbody = filteredUsersBody;
  tbody.innerHTML = '';

  const lastRoomDate = new Date(totalStats.endDate);
  let filterStartDate = new Date(totalStats.startDate);

  if (periodPreset === '1w') {
    filterStartDate = new Date(lastRoomDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (periodPreset === '1m') {
    filterStartDate = new Date(lastRoomDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (periodPreset === '2m') {
    filterStartDate = new Date(lastRoomDate.getTime() - 60 * 24 * 60 * 60 * 1000);
  } else if (periodPreset === '3m') {
    filterStartDate = new Date(lastRoomDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (periodPreset === '6m') {
    filterStartDate = new Date(lastRoomDate.getTime() - 180 * 24 * 60 * 60 * 1000);
  } else if (periodPreset === '12m') {
    filterStartDate = new Date(lastRoomDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  const startStr = formatDate(filterStartDate);
  const endStr = formatDate(lastRoomDate);
  
  if (periodPreset !== 'all') {
    periodRangeDisplay.innerText = `${startStr} ~ ${endStr} (설정 필터 범위)`;
  } else {
    periodRangeDisplay.innerText = `${totalStats.startDate} ~ ${totalStats.endDate} (전체 데이터 수집 범위)`;
  }

  const candidateUsers = [];

  // Group talk logs by nickname first
  const userTalks = {};
  chatLogs.forEach(log => {
    if (log.type === 'talk') {
      if (!userTalks[log.nickname]) {
        userTalks[log.nickname] = [];
      }
      userTalks[log.nickname].push(log.date);
    }
  });

  getFilteredUsers().forEach(u => {
    const myTalks = userTalks[u.nickname] || [];
    let periodTalks = 0;
    const userTalkDatesInRange = [];
    const userTalkDatesInRangeSet = new Set();

    myTalks.forEach(dateStr => {
      if (dateStr >= startStr && dateStr <= endStr) {
        periodTalks++;
        if (!userTalkDatesInRangeSet.has(dateStr)) {
          userTalkDatesInRangeSet.add(dateStr);
          userTalkDatesInRange.push(dateStr);
        }
      }
    });

    // Calculate maximum continuous dormant period
    let maxDormant = 0;
    if (u.totalTalks === 0) {
      // Never talked in the entire log: treat as maximum dormancy
      maxDormant = 9999;
    } else {
      const sortedUserTalkDates = userTalkDatesInRange.sort();
      if (sortedUserTalkDates.length === 0) {
        // Talked in the past, but not in this period
        if (u.lastTalk) {
          maxDormant = Math.ceil((lastRoomDate - new Date(u.lastTalk)) / (24 * 60 * 60 * 1000));
        } else {
          maxDormant = Math.ceil((lastRoomDate - filterStartDate) / (24 * 60 * 60 * 1000));
        }
      } else {
        // Talked in this period: calculate gaps
        let startBound = filterStartDate;
        if (u.lastTalk) {
          let latestBefore = null;
          myTalks.forEach(dateStr => {
            if (dateStr < startStr) {
              if (latestBefore === null || dateStr > latestBefore) {
                latestBefore = dateStr;
              }
            }
          });
          if (latestBefore !== null) {
            startBound = new Date(latestBefore);
          }
        }
        const gapStart = Math.ceil((new Date(sortedUserTalkDates[0]) - startBound) / (24 * 60 * 60 * 1000));
        maxDormant = Math.max(maxDormant, gapStart);

        for (let k = 0; k < sortedUserTalkDates.length - 1; k++) {
          const dateA = new Date(sortedUserTalkDates[k]);
          const dateB = new Date(sortedUserTalkDates[k+1]);
          const gap = Math.ceil((dateB - dateA) / (24 * 60 * 60 * 1000)) - 1;
          maxDormant = Math.max(maxDormant, gap);
        }

        const gapEnd = Math.ceil((lastRoomDate - new Date(sortedUserTalkDates[sortedUserTalkDates.length - 1])) / (24 * 60 * 60 * 1000));
        maxDormant = Math.max(maxDormant, gapEnd);
      }
    }

    // Calculate elapsed days since last talk
    let elapsedDays = 0;
    if (u.totalTalks === 0) {
      elapsedDays = 9999;
    } else if (u.lastTalk) {
      elapsedDays = Math.ceil((lastRoomDate - new Date(u.lastTalk)) / (24 * 60 * 60 * 1000));
    } else {
      elapsedDays = 9999;
    }

    const matchesTalks = periodTalks <= thresholdTalks;
    const matchesDormant = maxDormant >= minDormantDays;
    const matchesElapsed = elapsedDays >= minElapsedDays;

    if (matchesTalks && matchesDormant && matchesElapsed) {
      candidateUsers.push({
        nickname: u.nickname,
        periodTalks: periodTalks,
        maxDormant: maxDormant,
        elapsedDays: elapsedDays,
        lastTalk: u.lastTalk || '-'
      });
    }
  });

  targetCountEl.innerText = candidateUsers.length;

  if (candidateUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">설정한 필터 조건에 부합하는 사용자가 없습니다.</td></tr>`;
    return;
  }

  candidateUsers.forEach(cu => {
    const tr = document.createElement('tr');
    tr.classList.add('fade-in-row');
    
    let nicknameDisplay = cu.nickname;
    const userObj = activeUsers[cu.nickname];
    if (userObj && userObj.lastStatus === 'leave') {
      nicknameDisplay += ' (퇴장한 회원)';
    }

    tr.innerHTML = `
      <td><strong class="highlight">${escapeHtml(nicknameDisplay)}</strong></td>
      <td><strong>${cu.periodTalks}회</strong></td>
      <td>${cu.maxDormant === 9999 ? '-' : cu.maxDormant + '일'}</td>
      <td>${cu.elapsedDays === 9999 ? '-' : cu.elapsedDays + '일 경과'}</td>
      <td>${cu.lastTalk === '-' || !cu.lastTalk ? '대화 없음' : formatKoreanDate(cu.lastTalk)}</td>
    `;
    tbody.appendChild(tr);
  });

  window.lastFilteredUsers = candidateUsers;
}

function exportFilteredToExcel() {
  const targetUsers = window.lastFilteredUsers || [];
  if (targetUsers.length === 0) {
    alert('추출 조건에 맞는 대상자가 없어 다운로드할 수 없습니다.');
    return;
  }

  const dataRows = targetUsers.map(cu => ({
    '닉네임': cu.nickname,
    '설정기간 대화량': cu.periodTalks,
    '최대 연속 무활동일수 (일)': cu.maxDormant,
    '마지막 대화 후 경과 (일)': cu.elapsedDays,
    '마지막 대화 날짜': cu.lastTalk
  }));

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "추출 대상자 명단");
  
  XLSX.writeFile(wb, "ToriChat_Target_Members.xlsx");
}

// ----------------------------------------------------
// Chart.js Visualizations Setup
// ----------------------------------------------------

// User Ratio Horizontal Bar Chart (Top 10)
function renderUserRatioChart() {
  const canvas = document.getElementById('userRatioChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const fallbackImg = document.getElementById(canvas.id + '-img');
  if (typeof Chart === 'undefined') {
    if (fallbackImg && fallbackImg.getAttribute('src')) {
      canvas.style.display = 'none';
      fallbackImg.style.display = 'block';
    } else {
      const container = canvas.parentElement;
      if (container && !container.querySelector('.chart-error-placeholder')) {
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-placeholder';
        errorDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--pink); font-size:12px; text-align:center; padding:20px; gap:8px;';
        errorDiv.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i>
          <div>차트를 불러올 수 없습니다.</div>
          <div style="font-size:10px; color:var(--text-muted);">인터넷 연결 상태 및 Chart.js CDN 로딩 상태를 확인해주세요.</div>
        `;
        container.appendChild(errorDiv);
      }
    }
    return;
  }

  canvas.style.display = 'block';
  if (fallbackImg) fallbackImg.style.display = 'none';
  const container = canvas.parentElement;
  if (container) {
    const errorPlaceholder = container.querySelector('.chart-error-placeholder');
    if (errorPlaceholder) errorPlaceholder.remove();
  }

  if (charts.userRatio) charts.userRatio.destroy();

  const sortedUsers = getFilteredUsers()
    .filter(u => u.totalTalks > 0 && !u.isGhostOfGhost)
    .sort((a, b) => b.totalTalks - a.totalTalks);

  const N = sortedUsers.length;
  if (N === 0) return;

  // Calculate count for X%
  const K = Math.max(1, Math.round(N * chartSharePercent / 100));

  // Extract Top K and Bottom K users
  const topUsers = sortedUsers.slice(0, K);
  const bottomUsers = sortedUsers.slice(-K).reverse(); 
  
  const topNicknames = new Set(topUsers.map(u => u.nickname));
  const uniqueBottomUsers = bottomUsers.filter(u => !topNicknames.has(u.nickname));

  const displayUsers = [];
  topUsers.forEach(u => {
    displayUsers.push({ nickname: u.nickname, count: u.totalTalks, type: 'top' });
  });
  
  uniqueBottomUsers.reverse().forEach(u => {
    displayUsers.push({ nickname: u.nickname, count: u.totalTalks, type: 'bottom' });
  });

  const labels = displayUsers.map(u => `${u.nickname} (${u.type === 'top' ? '상위' : '하위'})`);
  const data = displayUsers.map(u => u.count);
  const colors = displayUsers.map(u => u.type === 'top' ? 'rgba(79, 172, 254, 0.85)' : 'rgba(236, 72, 153, 0.85)');

  charts.userRatio = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '대화 수',
        data: data,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9ca3af' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#f3f4f6', font: { weight: 'bold' } }
        }
      }
    }
  });
}

// Time Series Timeline Chart
// Time Series Timeline Chart
function updateTimeSeriesChart() {
  const canvas = document.getElementById('timeSeriesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const fallbackImg = document.getElementById(canvas.id + '-img');
  if (typeof Chart === 'undefined') {
    if (fallbackImg && fallbackImg.getAttribute('src')) {
      canvas.style.display = 'none';
      fallbackImg.style.display = 'block';
    } else {
      const container = canvas.parentElement;
      if (container && !container.querySelector('.chart-error-placeholder')) {
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-placeholder';
        errorDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--pink); font-size:12px; text-align:center; padding:20px; gap:8px;';
        errorDiv.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i>
          <div>차트를 불러올 수 없습니다.</div>
          <div style="font-size:10px; color:var(--text-muted);">인터넷 연결 상태 및 Chart.js CDN 로딩 상태를 확인해주세요.</div>
        `;
        container.appendChild(errorDiv);
      }
    }
    return;
  }

  canvas.style.display = 'block';
  if (fallbackImg) fallbackImg.style.display = 'none';
  const container = canvas.parentElement;
  if (container) {
    const errorPlaceholder = container.querySelector('.chart-error-placeholder');
    if (errorPlaceholder) errorPlaceholder.remove();
  }

  const resolution = timeResolutionSelect.value; 

  if (charts.timeSeries) charts.timeSeries.destroy();

  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  const targetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  const timeBuckets = {};

  targetLogs.forEach(log => {
    if (log.type !== 'talk') return;

    let bucketKey = '';
    if (resolution === 'daily') {
      bucketKey = log.date;
    } else if (resolution === 'weekly') {
      const dateObj = new Date(log.date);
      const day = dateObj.getDay();
      const sunDiff = dateObj.getDate() - day;
      const sunday = new Date(dateObj.setDate(sunDiff));
      bucketKey = `${formatDate(sunday)} 주`;
    } else if (resolution === 'monthly') {
      bucketKey = log.date.substring(0, 7); 
    }

    if (!timeBuckets[bucketKey]) {
      timeBuckets[bucketKey] = { total: 0, text: 0, media: 0 };
    }
    timeBuckets[bucketKey].total++;
    if (log.isMedia) timeBuckets[bucketKey].media++;
    else timeBuckets[bucketKey].text++;
  });

  // Generate continuous timeline from analysis start date to analysis end date (stock chart style)
  const sortedBuckets = [];
  let analysisStartDate = chkStartDate.checked ? inputStartDate.value : totalStats.startDate;
  let analysisEndDate = totalStats.endDate;

  if (analysisStartDate && analysisStartDate !== '-' && analysisEndDate && analysisEndDate !== '-') {
    if (resolution === 'daily') {
      let iter = new Date(analysisStartDate);
      const endLimit = new Date(analysisEndDate);
      iter.setHours(0, 0, 0, 0);
      endLimit.setHours(0, 0, 0, 0);
      while (iter <= endLimit) {
        const y = iter.getFullYear();
        const m = String(iter.getMonth() + 1).padStart(2, '0');
        const d = String(iter.getDate()).padStart(2, '0');
        sortedBuckets.push(`${y}-${m}-${d}`);
        iter.setDate(iter.getDate() + 1);
      }
    } else if (resolution === 'weekly') {
      let startSun = new Date(analysisStartDate);
      startSun.setDate(startSun.getDate() - startSun.getDay());
      startSun.setHours(0, 0, 0, 0);
      
      let endSun = new Date(analysisEndDate);
      endSun.setDate(endSun.getDate() - endSun.getDay());
      endSun.setHours(0, 0, 0, 0);
      
      let iter = new Date(startSun);
      while (iter <= endSun) {
        sortedBuckets.push(`${formatDate(iter)} 주`);
        iter.setDate(iter.getDate() + 7);
      }
    } else if (resolution === 'monthly') {
      let startYear = new Date(analysisStartDate).getFullYear();
      let startMonth = new Date(analysisStartDate).getMonth();
      const endYear = new Date(analysisEndDate).getFullYear();
      const endMonth = new Date(analysisEndDate).getMonth();
      
      let cy = startYear;
      let cm = startMonth;
      while (cy < endYear || (cy === endYear && cm <= endMonth)) {
        sortedBuckets.push(`${cy}-${String(cm + 1).padStart(2, '0')}`);
        cm++;
        if (cm > 11) {
          cm = 0;
          cy++;
        }
      }
    }
  }

  // Fallback if sortedBuckets is empty (e.g. invalid dates)
  if (sortedBuckets.length === 0) {
    Object.keys(timeBuckets).sort().forEach(k => sortedBuckets.push(k));
  }

  const totals = sortedBuckets.map(k => (timeBuckets[k] ? timeBuckets[k].total : 0));
  const texts = sortedBuckets.map(k => (timeBuckets[k] ? timeBuckets[k].text : 0));
  const medias = sortedBuckets.map(k => (timeBuckets[k] ? timeBuckets[k].media : 0));

  const primaryGrad = ctx.createLinearGradient(0, 0, 0, 300);
  primaryGrad.addColorStop(0, 'rgba(79, 172, 254, 0.4)');
  primaryGrad.addColorStop(1, 'rgba(79, 172, 254, 0.0)');

  const secondaryGrad = ctx.createLinearGradient(0, 0, 0, 300);
  secondaryGrad.addColorStop(0, 'rgba(0, 242, 258, 0.3)');
  secondaryGrad.addColorStop(1, 'rgba(0, 242, 258, 0.0)');

  const datasets = activeChartType === 'line' ? [
    {
      label: selectedMember === 'all' ? '총 대화량' : `${selectedMember} 대화량`,
      data: totals,
      borderColor: '#4facfe',
      backgroundColor: primaryGrad,
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointBackgroundColor: '#4facfe',
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: '아이콘(미디어)',
      data: medias,
      borderColor: '#00f2fe',
      backgroundColor: secondaryGrad,
      fill: true,
      tension: 0.3,
      borderWidth: 1.5,
      pointBackgroundColor: '#00f2fe',
      pointRadius: 0,
      pointHoverRadius: 5
    }
  ] : [
    {
      label: '텍스트 입력',
      data: texts,
      backgroundColor: 'rgba(79, 172, 254, 0.75)',
      borderRadius: 4
    },
    {
      label: '아이콘만 사용',
      data: medias,
      backgroundColor: 'rgba(236, 72, 153, 0.75)',
      borderRadius: 4
    }
  ];

  // Vertical dashed crosshair line plugin (Stock Chart Hover Effect)
  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: (chart) => {
      const active = chart.tooltip?._active || chart.tooltip?.active;
      if (active && active.length) {
        const activePoint = active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  charts.timeSeries = new Chart(ctx, {
    type: activeChartType,
    data: {
      labels: sortedBuckets,
      datasets: datasets
    },
    plugins: [crosshairPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#f3f4f6', font: { family: 'Outfit' } }
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)', borderDash: [4, 4] },
          ticks: { color: '#9ca3af', autoSkip: true, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  });
}

function renderHourlyActivityChart() {
  const canvas = document.getElementById('hourlyActivityChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const fallbackImg = document.getElementById(canvas.id + '-img');
  if (typeof Chart === 'undefined') {
    if (fallbackImg && fallbackImg.getAttribute('src')) {
      canvas.style.display = 'none';
      fallbackImg.style.display = 'block';
    } else {
      const container = canvas.parentElement;
      if (container && !container.querySelector('.chart-error-placeholder')) {
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-placeholder';
        errorDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--pink); font-size:12px; text-align:center; padding:20px; gap:8px;';
        errorDiv.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i>
          <div>차트를 불러올 수 없습니다.</div>
          <div style="font-size:10px; color:var(--text-muted);">인터넷 연결 상태 및 Chart.js CDN 로딩 상태를 확인해주세요.</div>
        `;
        container.appendChild(errorDiv);
      }
    }
    return;
  }

  canvas.style.display = 'block';
  if (fallbackImg) fallbackImg.style.display = 'none';
  const container = canvas.parentElement;
  if (container) {
    const errorPlaceholder = container.querySelector('.chart-error-placeholder');
    if (errorPlaceholder) errorPlaceholder.remove();
  }

  if (charts.hourlyActivity) charts.hourlyActivity.destroy();

  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  const targetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  const hourlyBuckets = Array(24).fill(0);
  targetLogs.forEach(log => {
    if (log.type === 'talk' && log.timeStr) {
      const hour = parseInt(log.timeStr.substring(0, 2));
      if (hour >= 0 && hour < 24) {
        hourlyBuckets[hour]++;
      }
    }
  });

  charts.hourlyActivity = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}시`),
      datasets: [{
        label: selectedMember === 'all' ? '전체 대화 빈도' : `${selectedMember} 대화 빈도`,
        data: hourlyBuckets,
        backgroundColor: 'rgba(79, 172, 254, 0.25)',
        borderColor: '#4facfe',
        pointBackgroundColor: '#4facfe',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4facfe',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } },
          ticks: { backdropColor: 'transparent', color: '#6b7280', display: false }
        }
      }
    }
  });
}

function renderWeeklyActivityChart() {
  const canvas = document.getElementById('weeklyActivityChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const fallbackImg = document.getElementById(canvas.id + '-img');
  if (typeof Chart === 'undefined') {
    if (fallbackImg && fallbackImg.getAttribute('src')) {
      canvas.style.display = 'none';
      fallbackImg.style.display = 'block';
    } else {
      const container = canvas.parentElement;
      if (container && !container.querySelector('.chart-error-placeholder')) {
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-placeholder';
        errorDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--pink); font-size:12px; text-align:center; padding:20px; gap:8px;';
        errorDiv.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i>
          <div>차트를 불러올 수 없습니다.</div>
          <div style="font-size:10px; color:var(--text-muted);">인터넷 연결 상태 및 Chart.js CDN 로딩 상태를 확인해주세요.</div>
        `;
        container.appendChild(errorDiv);
      }
    }
    return;
  }

  canvas.style.display = 'block';
  if (fallbackImg) fallbackImg.style.display = 'none';
  const container = canvas.parentElement;
  if (container) {
    const errorPlaceholder = container.querySelector('.chart-error-placeholder');
    if (errorPlaceholder) errorPlaceholder.remove();
  }

  if (charts.weeklyActivity) charts.weeklyActivity.destroy();

  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  const targetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  const weeklyBuckets = Array(7).fill(0);
  targetLogs.forEach(log => {
    if (log.type === 'talk' && log.date) {
      const d = new Date(log.date);
      const day = d.getDay();
      if (day >= 0 && day < 7) {
        weeklyBuckets[day]++;
      }
    }
  });

  charts.weeklyActivity = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
      datasets: [{
        data: weeklyBuckets,
        backgroundColor: [
          '#ec4899', // Sun - Pink
          '#3b82f6', // Mon - Blue
          '#8b5cf6', // Tue - Purple
          '#10b981', // Wed - Green
          '#f59e0b', // Thu - Yellow
          '#06b6d4', // Fri - Cyan
          '#6b7280'  // Sat - Gray
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f3f4f6', font: { family: 'Outfit', size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      cutout: '72%'
    }
  });
}

function renderTopicDistributionChart() {
  const canvas = document.getElementById('topicDistributionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const fallbackImg = document.getElementById(canvas.id + '-img');
  if (typeof Chart === 'undefined') {
    if (fallbackImg && fallbackImg.getAttribute('src')) {
      canvas.style.display = 'none';
      fallbackImg.style.display = 'block';
    } else {
      const container = canvas.parentElement;
      if (container && !container.querySelector('.chart-error-placeholder')) {
        canvas.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chart-error-placeholder';
        errorDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:200px; color:var(--pink); font-size:12px; text-align:center; padding:20px; gap:8px;';
        errorDiv.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation" style="font-size:24px;"></i>
          <div>차트를 불러올 수 없습니다.</div>
          <div style="font-size:10px; color:var(--text-muted);">인터넷 연결 상태 및 Chart.js CDN 로딩 상태를 확인해주세요.</div>
        `;
        container.appendChild(errorDiv);
      }
    }
    return;
  }

  canvas.style.display = 'block';
  if (fallbackImg) fallbackImg.style.display = 'none';
  const container = canvas.parentElement;
  if (container) {
    const errorPlaceholder = container.querySelector('.chart-error-placeholder');
    if (errorPlaceholder) errorPlaceholder.remove();
  }

  if (charts.topicDistribution) charts.topicDistribution.destroy();

  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  const targetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  // Initialize counts for dynamically loaded TAXONOMY categories
  const catStats = {};
  TAXONOMY.forEach(cat => {
    catStats[cat.id] = 0;
  });

  targetLogs.forEach(log => {
    if (log.type === 'talk' && log.content) {
      const catId = log.category || 'ETC';
      if (catStats[catId] !== undefined) {
        catStats[catId]++;
      }
    }
  });

  const labels = TAXONOMY.map(cat => cat.label);
  const data = TAXONOMY.map(cat => catStats[cat.id] || 0);
  const colors = TAXONOMY.map(cat => cat.color);

  charts.topicDistribution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: selectedMember === 'all' ? '전체 언급 빈도' : `${selectedMember} 언급 빈도`,
        data: data,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9ca3af' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#f3f4f6', font: { weight: 'bold' } }
        }
      },
      onClick: (e, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const selectedCatId = TAXONOMY[index].id;
          openTopicExplorer(selectedCatId);
        } else {
          openTopicExplorer('ALL');
        }
      }
    }
  });
}

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Web Audio API Sci-Fi Sound Synthesizer
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// High-tech sci-fi UI button click sound (quick sweep)
function playSfClickSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {
    console.warn("Audio synthesis blocked or unsupported:", e);
  }
}

// High-tech sci-fi screen transition / reveal sweep
function playSfRevealSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc2.type = 'triangle';
    
    const now = ctx.currentTime;
    const duration = 0.5;
    
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + duration);
    
    osc2.frequency.setValueAtTime(82, now); // slight detuning
    osc2.frequency.exponentialRampToValueAtTime(1002, now + duration);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(2500, now + duration * 0.8);
    filter.Q.value = 6;
    
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration);
    osc2.stop(now + duration);
  } catch (e) {
    console.warn("Audio synthesis blocked or unsupported:", e);
  }
}

function bindButtonSfx() {
  const buttons = document.querySelectorAll('button, .btn, .tab-btn');
  buttons.forEach(btn => {
    if (btn.dataset.sfxBound) return;
    btn.addEventListener('click', playSfClickSound);
    btn.dataset.sfxBound = "true";
  });
}

// Populate dormancy & chat condition dropdowns dynamically
function populateDropdowns() {
  if (selectDormancy) {
    selectDormancy.innerHTML = '<option value="none" selected>없음</option>';
    for (let i = 1; i <= 20; i++) {
      const opt = document.createElement('option');
      opt.value = `${i}w`;
      opt.innerText = `${i}주일 지난사람`;
      selectDormancy.appendChild(opt);
    }
  }
  
  if (selectChatCondition) {
    selectChatCondition.innerHTML = '<option value="0" selected>없음</option>';
    for (let i = 1; i <= 20; i++) {
      const opt = document.createElement('option');
      opt.value = `${i}`;
      opt.innerText = `대화 ${i}글자 이상만`;
      selectChatCondition.appendChild(opt);
    }
  }
}

// Background Music Controller
function initMusicPlayer() {
  if (!bgMusic || !btnMusicToggle) return;
  
  bgMusic.volume = 0.3;

  const startPlay = () => {
    bgMusic.play().then(() => {
      musicPlaying = true;
      updateMusicUi();
    }).catch((err) => {
      console.log("Autoplay blocked, waiting for click:", err);
    });
    document.removeEventListener('click', startPlay);
  };
  document.addEventListener('click', startPlay);

  btnMusicToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    playSfClickSound();
    if (musicPlaying) {
      bgMusic.pause();
      musicPlaying = false;
    } else {
      bgMusic.play().then(() => {
        musicPlaying = true;
      }).catch(err => console.log(err));
    }
    updateMusicUi();
  });
}

function updateMusicUi() {
  if (musicPlaying) {
    btnMusicToggle.innerHTML = '<i class="fa-solid fa-pause"></i>';
    musicVisualizer.classList.add('playing');
  } else {
    btnMusicToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
    musicVisualizer.classList.remove('playing');
  }
}

// Emoticon Filter Toggle
function initEmojiToggle() {
  if (!btnToggleEmoji) return;
  btnToggleEmoji.addEventListener('click', () => {
    playSfClickSound();
    excludeEmojis = !excludeEmojis;
    if (excludeEmojis) {
      btnToggleEmoji.innerHTML = '<i class="fa-solid fa-face-meh"></i> 아이콘 대화 제외';
      btnToggleEmoji.classList.remove('include');
      btnToggleEmoji.classList.add('exclude');
      btnToggleEmoji.dataset.value = 'exclude';
    } else {
      btnToggleEmoji.innerHTML = '<i class="fa-solid fa-face-smile"></i> 아이콘 대화 포함';
      btnToggleEmoji.classList.remove('exclude');
      btnToggleEmoji.classList.add('include');
      btnToggleEmoji.dataset.value = 'include';
    }
    
    if (rawChatText) {
      startAnalysis();
    }
  });
}

// Korean Date Formatting Helper
function formatKoreanDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  const d = new Date(year, month - 1, day);
  const weekDays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${year}년 ${month}월 ${day}일 ${weekDays[d.getDay()]}`;
}

// Korean Date Parsing Helper for Sorting
function parseKoreanDate(str) {
  if (!str || str === '-') return new Date(0);
  const cleaned = str.replace(/\[횟수:\s*\d+\]/, '').replace(/=>.*/, '');
  const matches = cleaned.match(/\d+/g);
  if (!matches || matches.length < 3) return new Date(0);
  const year = parseInt(matches[0]);
  const month = parseInt(matches[1]);
  const day = parseInt(matches[2]);
  return new Date(year, month - 1, day);
}

// Check if content represents an emoticon message
function isEmoticonMessage(content, platform) {
  const trimmed = content.trim();
  if (platform === 'kakao_pc' || platform === 'kakao_mobile') {
    return trimmed === '이모티콘';
  }
  if (platform === 'line') {
    return trimmed === '[이모티콘]' || trimmed === '[Sticker]' || trimmed === 'Sticker';
  }
  if (platform === 'telegram') {
    return trimmed === '[이모티콘]' || trimmed === 'Sticker';
  }
  if (platform === 'band') {
    return trimmed === '[스티커]';
  }
  if (platform === 'whatsapp') {
    return trimmed === 'sticker';
  }
  return trimmed.includes('이모티콘') || trimmed.includes('스티커') || trimmed.includes('Sticker');
}

// Clean date/time prefix from raw name
function cleanSystemName(rawName) {
  let name = rawName.trim();
  // 1. Remove bracketed timestamps: [2026. 06. 16 10:20] or similar
  if (name.includes(']')) {
    const idx = name.lastIndexOf(']');
    name = name.substring(idx + 1).trim();
  }
  // 2. Remove comma-separated prefix (used in mobile KakaoTalk/Band: "2026년 ... 10:20, 정다운")
  if (name.includes(',')) {
    const idx = name.lastIndexOf(',');
    name = name.substring(idx + 1).trim();
  }
  // 3. Remove colon-separated prefix if any
  if (name.includes(':')) {
    const idx = name.lastIndexOf(':');
    name = name.substring(idx + 1).trim();
  }
  return name;
}

// Extract nickname from join/leave/kick messages across all platforms
function extractSystemName(line) {
  let text = line.trim();
  if (text.includes('\t')) {
    const parts = text.split('\t');
    text = parts[1] || parts[0];
  }
  
  let name = '';
  if (text.includes('님이')) {
    name = text.split('님이')[0];
  } else if (text.includes('님을')) {
    name = text.split('님을')[0];
  } else if (text.toLowerCase().includes('joined')) {
    name = text.split(/joined/i)[0];
  } else if (text.toLowerCase().includes('left')) {
    name = text.split(/left/i)[0];
  } else {
    name = text.split(' ')[0];
  }
  
  return cleanSystemName(name);
}

// Get voluntary leave vs forced kick subtype
function getLeaveSubtype(line) {
  if (line.includes('내보냈습니다') || line.includes('removed') || line.includes('강퇴')) {
    return '강퇴';
  }
  return '나감';
}

// ----------------------------------------------------
// Phase 2 Additional Helpers & Exporters
// ----------------------------------------------------

function getFilteredUsers() {
  let usersList = Object.values(activeUsers);
  if (hideLeavers) {
    usersList = usersList.filter(u => {
      if (u.lastStatus !== 'leave') return true;
      // Re-entrant protection: same person rejoined, don't treat as leaver
      if (protectReentrants && isReentrantInRoom(u)) return true;
      return false;
    });
  }
  return usersList;
}

// Determine if a user is a re-entrant currently in the room
// (joined multiple times, and their last join is after their last leave)
function isReentrantInRoom(u) {
  if (!u || u.joinDates.length < 2) return false;
  const sortedJoins = u.joinDates.slice().sort();
  const lastJoin = sortedJoins[sortedJoins.length - 1];
  if (u.leaveDates.length === 0) return true; // Multiple joins, no leave recorded
  const lastLeave = u.leaveDates.map(ld => ld.date).sort().pop();
  return lastJoin >= lastLeave; // Last action was a join (re-entry confirmed)
}

// Toggle re-entrant protection state
function toggleProtectReentrants() {
  protectReentrants = !protectReentrants;
  if (btnProtectReentrants) {
    btnProtectReentrants.classList.toggle('active', protectReentrants);
  }
  calculateGhostMetrics();
  renderTabContent();
  populateChartMemberSelect();
  updateTimeSeriesChart();
  renderUserRatioChart();
  renderHourlyActivityChart();
  renderWeeklyActivityChart();
  renderTopicDistributionChart();
  runTargetFiltering();
}

function initGlossyCursorEffects() {
  const glossyElements = document.querySelectorAll('.input-date, .input-number, .select-box, .btn, .tab-btn');
  glossyElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

function makeTableResizable(table) {
  if (!table) return;
  const cols = table.querySelectorAll('thead th');
  
  cols.forEach(col => {
    if (col.querySelector('.col-resizer')) return;
    
    const resizer = document.createElement('div');
    resizer.className = 'col-resizer';
    col.appendChild(resizer);
    
    let startX = 0;
    let startWidth = 0;
    
    const onMouseMove = (e) => {
      const width = startWidth + (e.pageX - startX);
      col.style.width = `${width}px`;
      col.style.minWidth = `${width}px`;
    };
    
    const onMouseUp = () => {
      resizer.classList.remove('resizing');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      startX = e.pageX;
      startWidth = col.offsetWidth;
      resizer.classList.add('resizing');
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    resizer.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
  });
}

async function fetchLocalFileContent(fileName) {
  // 1. Try relative path fetch
  try {
    const r = await fetch(fileName);
    if (r.ok) return await r.text();
  } catch (e) {
    console.warn(`Relative fetch for ${fileName} failed:`, e);
  }

  // 2. Try fetching from http://localhost:9090/
  try {
    const r = await fetch(`http://localhost:9090/${fileName}`);
    if (r.ok) return await r.text();
  } catch (e) {
    console.warn(`Localhost (port 9090) fetch for ${fileName} failed:`, e);
  }

  // 3. Try fetching from http://127.0.0.1:9090/
  try {
    const r = await fetch(`http://127.0.0.1:9090/${fileName}`);
    if (r.ok) return await r.text();
  } catch (e) {
    console.warn(`Localhost (127.0.0.1:9090) fetch for ${fileName} failed:`, e);
  }

  throw new Error(`Could not load ${fileName}`);
}

function extractCssFromStyleSheets() {
  let cssText = '';
  try {
    for (let sheet of document.styleSheets) {
      if (!sheet.href || sheet.href.includes('style.css')) {
        for (let rule of sheet.cssRules) {
          cssText += rule.cssText + '\n';
        }
      }
    }
  } catch (e) {
    console.warn("Could not read stylesheet rules from document.styleSheets:", e);
  }
  return cssText;
}

async function exportInteractiveHtml() {
  const chartIds = [
    'timeSeriesChart',
    'userRatioChart',
    'hourlyActivityChart',
    'weeklyActivityChart',
    'topicDistributionChart'
  ];
  
  // 1. Temporarily switch chart displays to fallback images in the live DOM
  const chartStates = [];
  chartIds.forEach(id => {
    const canvas = document.getElementById(id);
    const img = document.getElementById(id + '-img');
    if (canvas && img) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        chartStates.push({
          canvas: canvas,
          img: img,
          canvasDisplay: canvas.style.display,
          imgDisplay: img.style.display,
          imgSrc: img.src
        });
        img.src = dataUrl;
        img.style.display = 'block';
        canvas.style.display = 'none';
      } catch (e) {
        console.warn(`Failed to export chart ${id} to image:`, e);
      }
    }
  });

  // 2. Read the outerHTML
  let docHtml = document.documentElement.outerHTML;

  // 3. Immediately restore live DOM state
  chartStates.forEach(state => {
    state.canvas.style.display = state.canvasDisplay;
    state.img.style.display = state.imgDisplay;
    state.img.src = state.imgSrc;
  });

  try {
    // 4. Extract CSS content
    let cssContent = '';
    try {
      cssContent = await fetchLocalFileContent('style.css');
    } catch (e) {
      console.warn("Fallback to document.styleSheets extraction for CSS...");
      cssContent = extractCssFromStyleSheets();
    }

    // 5. Clean up HTML and inject static styles & behaviors
    // Strip dynamic app.js script tag
    docHtml = docHtml.replace(/<script\s+src="app\.js"\s*><\/script>/gi, '');
    // Strip external stylesheet link
    docHtml = docHtml.replace(/<link\s+rel="stylesheet"\s+href="style\.css"\s*>/gi, '');

    // Hide control panel, file loaders, and report download toolbar as they are not needed in completed static report
    docHtml = docHtml.replace('class="control-panel glass"', 'class="control-panel glass" style="display: none;"');
    docHtml = docHtml.replace('class="report-export-bar glass animate-fade-in"', 'class="report-export-bar glass animate-fade-in" style="display: none;"');
    docHtml = docHtml.replace('class="interaction-controls"', 'class="interaction-controls" style="display: none;"');
    docHtml = docHtml.replace('class="file-loader-card"', 'class="file-loader-card" style="display: none;"');
    
    // Inject CSS
    if (cssContent) {
      const styleTag = `<style>${cssContent}</style>`;
      docHtml = docHtml.replace('</head>', `${styleTag}</head>`);
    }

    // Inject lightweight, self-contained interaction script
    const staticScript = `
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          // Tab Switching Logic
          const tabButtons = document.querySelectorAll('.tab-btn');
          const tabContents = document.querySelectorAll('.tab-content');
          const searchUsernameInput = document.getElementById('search-username');
          const usersTableBody = document.getElementById('users-table-body');
          const hourlyTableBody = document.getElementById('hourly-table-body');

          tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
              tabButtons.forEach(b => b.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));
              btn.classList.add('active');
              const activeTab = btn.getAttribute('data-tab');
              const targetContent = document.getElementById(activeTab);
              if (targetContent) targetContent.classList.add('active');
              
              const searchArea = document.getElementById('tabs-search-area');
              if (searchArea) {
                searchArea.style.display = (activeTab === 'tab-raw') ? 'none' : 'flex';
              }
            });
          });

          // Live Username Filter Logic
          if (searchUsernameInput) {
            searchUsernameInput.addEventListener('input', () => {
              const query = searchUsernameInput.value.toLowerCase().trim();
              
              // Filter Users Table
              if (usersTableBody) {
                const rows = usersTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                  const nicknameText = row.querySelector('td')?.textContent || '';
                  if (nicknameText.toLowerCase().includes(query)) {
                    row.style.display = '';
                  } else {
                    row.style.display = 'none';
                  }
                });
              }

              // Filter Hourly Table
              if (hourlyTableBody) {
                const rows = hourlyTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                  const nicknameText = row.querySelector('td')?.textContent || '';
                  if (nicknameText.toLowerCase().includes(query)) {
                    row.style.display = '';
                  } else {
                    row.style.display = 'none';
                  }
                });
              }
            });
          }

          // Modals Control
          const btnShowAllUsers = document.getElementById('btn-show-all-users-modal');
          const usersModal = document.getElementById('users-modal');
          const btnCloseModal = document.getElementById('btn-close-modal');

          if (btnShowAllUsers && usersModal) {
            btnShowAllUsers.addEventListener('click', () => { usersModal.style.display = 'flex'; });
          }
          if (btnCloseModal && usersModal) {
            btnCloseModal.addEventListener('click', () => { usersModal.style.display = 'none'; });
          }
          if (usersModal) {
            usersModal.addEventListener('click', (e) => { if (e.target === usersModal) usersModal.style.display = 'none'; });
          }

          const btnShowFiltered = document.getElementById('btn-show-filtered-modal');
          const filteredUsersModal = document.getElementById('filtered-users-modal');
          const btnCloseFiltered = document.getElementById('btn-close-filtered-modal');

          if (btnShowFiltered && filteredUsersModal) {
            btnShowFiltered.addEventListener('click', () => { filteredUsersModal.style.display = 'flex'; });
          }
          if (btnCloseFiltered && filteredUsersModal) {
            btnCloseFiltered.addEventListener('click', () => { filteredUsersModal.style.display = 'none'; });
          }
          if (filteredUsersModal) {
            filteredUsersModal.addEventListener('click', (e) => { if (e.target === filteredUsersModal) filteredUsersModal.style.display = 'none'; });
          }

          // Print Action
          const btnPrintReport = document.getElementById('btn-print-report');
          if (btnPrintReport) {
            btnPrintReport.addEventListener('click', () => { window.print(); });
          }
        });
      </script>
    `;

    docHtml = docHtml.replace('</body>', `${staticScript}</body>`);

    // Prepend DOCTYPE to prevent browser Quirks Mode
    docHtml = '<!DOCTYPE html>\n' + docHtml;

    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ToriChat_Report_${totalStats.startDate || 'Export'}_${totalStats.endDate || 'Data'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed:", err);
    alert("리포트 파일을 생성하는 데 실패했습니다. CSS 추출에 문제가 있습니다.");
  }
}

// Launch event initialization
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initEvents);
} else {
  initEvents();
}

// ============================================================
// Nickname Change Detection & Merge Engine
// ============================================================
// KakaoTalk does not emit a "nickname changed" event in group chat logs.
// However, when a user changes their profile name, they often appear to
// "leave" under the old name and "join" under the new name within a very
// short window. This heuristic detects that pattern and links the two
// identities as one person, recording the old nickname in oldNicknames[].
//
// Heuristic criteria (ALL must be true):
//  1. User A has a 'leave' event (last status = leave in masterUsers)
//  2. User B has a 'join' event with timestamp <= 5 minutes after A's leave
//  3. areNamesSimilar(A, B) returns true:
//     - B contains A as a substring (or vice-versa)
//     - They share a common prefix of >= 2 characters
//     - Levenshtein similarity >= 60%
// ============================================================

/**
 * Compute edit distance between two strings (Levenshtein algorithm).
 */
function getEditDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Returns true if the two names are likely the same person with a profile name update.
 */
function areNamesSimilar(nameA, nameB) {
  if (!nameA || !nameB) return false;
  if (nameA === nameB) return false; // identical, no merge needed

  const a = nameA.toLowerCase().trim();
  const b = nameB.toLowerCase().trim();

  // 1. Substring containment (one is a variant of the other)
  if (a.includes(b) || b.includes(a)) return true;

  // 2. Common prefix length >= 2
  let prefixLen = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }
  if (prefixLen >= 2) return true;

  // 3. Levenshtein similarity >= 60%
  const dist = getEditDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 0 && (1 - dist / maxLen) >= 0.6) return true;

  return false;
}

/**
 * Scan allLogsRaw for leave→join pairs within TIME_WINDOW_MS that pass
 * areNamesSimilar, and return a list of merge proposals:
 * { oldName, newName, leaveTimestamp, joinTimestamp }
 */
function detectNicknameChanges(allLogsRaw) {
  const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // Build a flat list of leave and join events with precise timestamps
  const leaveEvents = [];
  const joinEvents  = [];

  allLogsRaw.forEach(log => {
    if (log.type === 'leave') {
      leaveEvents.push({ name: log.nickname, ts: log.timestamp || 0, date: log.date });
    } else if (log.type === 'join') {
      joinEvents.push({ name: log.nickname, ts: log.timestamp || 0, date: log.date });
    }
  });

  const merges = [];
  const usedLeaveIdx  = new Set();
  const usedJoinIdx   = new Set();

  // For each leave event, find the closest matching join event within the window
  leaveEvents.forEach((lev, li) => {
    if (usedLeaveIdx.has(li)) return;

    // Candidate joins within time window
    let bestJoin = null;
    let bestScore = -Infinity;
    let bestJi = -1;

    joinEvents.forEach((jev, ji) => {
      if (usedJoinIdx.has(ji)) return;
      if (jev.name === lev.name) return; // same name, skip
      const delta = jev.ts - lev.ts;
      if (delta < 0 || delta > TIME_WINDOW_MS) return;
      if (!areNamesSimilar(lev.name, jev.name)) return;

      // Score: prefer smaller delta and higher similarity
      const similarity = 1 - getEditDistance(lev.name.toLowerCase(), jev.name.toLowerCase()) /
                         Math.max(lev.name.length, jev.name.length);
      const score = similarity * 1000 - delta; // higher is better
      if (score > bestScore) {
        bestScore = score;
        bestJoin  = jev;
        bestJi    = ji;
      }
    });

    if (bestJoin !== null) {
      usedLeaveIdx.add(li);
      usedJoinIdx.add(bestJi);
      merges.push({
        oldName: lev.name,
        newName: bestJoin.name,
        leaveTimestamp: lev.ts,
        joinTimestamp:  bestJoin.ts
      });
    }
  });

  return merges;
}

/**
 * Apply detected nickname merges to masterUsers and activeUsers:
 * - Fold oldName's stats into newName.
 * - Record oldName in newName.oldNicknames.
 * - Remove oldName entry from both maps.
 */
function applyNicknameMerges(merges) {
  merges.forEach(merge => {
    const { oldName, newName } = merge;

    // Only merge if both names actually exist as separate entries
    const oldMU = masterUsers[oldName];
    const newMU = masterUsers[newName];
    if (!oldMU || !newMU) return;

    // Initialise oldNicknames arrays if absent
    if (!oldMU.oldNicknames) oldMU.oldNicknames = [];
    if (!newMU.oldNicknames) newMU.oldNicknames = [];

    // Record old name in new entry's history
    newMU.oldNicknames.push(oldName);
    // Carry forward any aliases the old entry had
    oldMU.oldNicknames.forEach(alias => {
      if (!newMU.oldNicknames.includes(alias)) newMU.oldNicknames.push(alias);
    });

    // Merge join/leave dates
    oldMU.joinDates.forEach(d => {
      if (!newMU.joinDates.includes(d)) newMU.joinDates.push(d);
    });
    oldMU.leaveDates.forEach(ld => {
      if (!newMU.leaveDates.some(x => x.date === ld.date)) newMU.leaveDates.push(ld);
    });

    // Merge absolute dates
    if (!newMU.absoluteFirstTalkDate ||
        (oldMU.absoluteFirstTalkDate && oldMU.absoluteFirstTalkDate < newMU.absoluteFirstTalkDate)) {
      newMU.absoluteFirstTalkDate = oldMU.absoluteFirstTalkDate;
    }
    if (!newMU.absoluteLastTalkDate ||
        (oldMU.absoluteLastTalkDate && oldMU.absoluteLastTalkDate > newMU.absoluteLastTalkDate)) {
      newMU.absoluteLastTalkDate = oldMU.absoluteLastTalkDate;
    }
    if (!newMU.absoluteJoinDate ||
        (oldMU.absoluteJoinDate && oldMU.absoluteJoinDate < newMU.absoluteJoinDate)) {
      newMU.absoluteJoinDate = oldMU.absoluteJoinDate;
    }

    // Remove old masterUser entry
    delete masterUsers[oldName];

    // Now merge activeUsers entries if they exist separately
    const oldAU = activeUsers[oldName];
    const newAU = activeUsers[newName];
    if (oldAU && newAU) {
      newAU.oldNicknames = newMU.oldNicknames.slice();

      // Merge talk counts
      newAU.totalTalks += oldAU.totalTalks;
      newAU.textCount  += oldAU.textCount;
      newAU.mediaCount += oldAU.mediaCount;

      // Merge talk dates set
      oldAU.talkDates.forEach(d => newAU.talkDates.add(d));

      // Merge hourly timeline
      for (let h = 0; h < 24; h++) {
        newAU.hourlyTimeline[h] = (newAU.hourlyTimeline[h] || 0) + (oldAU.hourlyTimeline[h] || 0);
      }

      // Merge join/leave dates
      oldAU.joinDates.forEach(d => {
        if (!newAU.joinDates.includes(d)) newAU.joinDates.push(d);
      });
      oldAU.leaveDates.forEach(ld => {
        if (!newAU.leaveDates.some(x => x.date === ld.date)) newAU.leaveDates.push(ld);
      });
      newAU.reenteredCount = Math.max(0, newAU.joinDates.length - 1);

      // Merge absolute dates
      if (!newAU.absoluteFirstTalkDate ||
          (oldAU.absoluteFirstTalkDate && oldAU.absoluteFirstTalkDate < newAU.absoluteFirstTalkDate)) {
        newAU.absoluteFirstTalkDate = oldAU.absoluteFirstTalkDate;
      }
      if (!newAU.absoluteLastTalkDate ||
          (oldAU.absoluteLastTalkDate && oldAU.absoluteLastTalkDate > newAU.absoluteLastTalkDate)) {
        newAU.absoluteLastTalkDate = oldAU.absoluteLastTalkDate;
      }

      // Merge first/last talk in filtered period
      if (!newAU.firstTalk || (oldAU.firstTalk && oldAU.firstTalk < newAU.firstTalk)) {
        newAU.firstTalk = oldAU.firstTalk;
      }
      if (!newAU.lastTalk || (oldAU.lastTalk && oldAU.lastTalk > newAU.lastTalk)) {
        newAU.lastTalk = oldAU.lastTalk;
      }

      // Keep the most recent status
      if (newAU.lastStatus === 'leave' && oldAU.lastStatus !== 'leave') {
        newAU.lastStatus = oldAU.lastStatus;
      }

      delete activeUsers[oldName];
    } else if (oldAU && !newAU) {
      // old name has activeUser entry but new doesn't yet — rename the key
      oldAU.nickname = newName;
      oldAU.oldNicknames = newMU.oldNicknames.slice();
      activeUsers[newName] = oldAU;
      delete activeUsers[oldName];
    }
  });
}

// ----------------------------------------------------
// Ghost Finder Modal Logic & Interactive Purging
// ----------------------------------------------------
let currentFoundGhosts = [];

function initGhostFinder() {
  const btnGhostFinder = document.getElementById('btn-ghost-finder');
  const ghostFinderModal = document.getElementById('ghost-finder-modal');
  const btnCloseGhostModal = document.getElementById('btn-close-ghost-modal');
  const btnSearchGhosts = document.getElementById('btn-search-ghosts');
  const btnPurgeGhosts = document.getElementById('btn-purge-ghosts');
  const btnRestoreGhosts = document.getElementById('btn-restore-ghosts');
  const ghostStartDateInput = document.getElementById('ghost-start-date');
  const ghostEndDateInput = document.getElementById('ghost-end-date');
  const ghostResultsBody = document.getElementById('ghost-finder-results-body');
  const ghostFinderCount = document.getElementById('ghost-finder-count');
  
  if (!btnGhostFinder || !ghostFinderModal) return;

  btnGhostFinder.addEventListener('click', () => {
    playSfClickSound();
    
    // Default dates to totalStats date range
    if (totalStats && totalStats.startDate && totalStats.endDate) {
      ghostStartDateInput.value = formatInputDate(totalStats.startDate);
      ghostEndDateInput.value = formatInputDate(totalStats.endDate);
    }
    
    // Reset ghost finder display elements to default state
    currentFoundGhosts = [];
    ghostFinderCount.innerText = '0';
    ghostResultsBody.innerHTML = '';
    const emptyStateEl = document.getElementById('ghost-finder-empty');
    const emptyStateText = document.getElementById('ghost-finder-empty-text');
    const tableWrapperEl = document.getElementById('ghost-finder-table-wrapper');
    if (emptyStateText) emptyStateText.innerText = '유령 기준 날짜를 설정하고 검색해 주세요.';
    if (emptyStateEl) emptyStateEl.style.display = 'block';
    if (tableWrapperEl) tableWrapperEl.style.display = 'none';
    btnPurgeGhosts.setAttribute('disabled', 'true');
    
    ghostFinderModal.style.display = 'flex';
    updatePurgedSection();
  });

  btnCloseGhostModal.addEventListener('click', () => {
    playSfClickSound();
    ghostFinderModal.style.display = 'none';
  });

  ghostFinderModal.addEventListener('click', (e) => {
    if (e.target === ghostFinderModal) {
      ghostFinderModal.style.display = 'none';
    }
  });

  btnSearchGhosts.addEventListener('click', () => {
    playSfClickSound();
    const startVal = ghostStartDateInput.value;
    const endVal = ghostEndDateInput.value;
    if (!startVal || !endVal) {
      alert('시작일과 종료일을 입력해주세요.');
      return;
    }
    
    const startMs = new Date(startVal).getTime();
    const endMs = new Date(endVal).getTime();
    if (startMs > endMs) {
      alert('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }

    currentFoundGhosts = [];
    
    // Build maps in O(L) time
    const talkCounts = {};
    const hasLeftInPeriodMap = new Set();
    
    cachedAllLogsRaw.forEach(log => {
      const name = log.nickname;
      if (!name) return;
      const logTime = log.timestamp || new Date(log.date).getTime();
      if (logTime >= startMs && logTime <= endMs) {
        if (log.type === 'talk') {
          talkCounts[name] = (talkCounts[name] || 0) + 1;
        } else if (log.type === 'leave') {
          hasLeftInPeriodMap.add(name);
        }
      }
    });
    
    Object.values(masterUsers).forEach(mu => {
      if (purgedGhosts.has(mu.nickname)) return;

      // Check if they joined on or before end date
      const hasJoined = mu.joinDates.some(d => new Date(d).getTime() <= endMs) || 
                        (mu.absoluteFirstTalkDate && new Date(mu.absoluteFirstTalkDate).getTime() <= endMs) ||
                        (mu.absoluteJoinDate && new Date(mu.absoluteJoinDate).getTime() <= endMs);
      
      if (!hasJoined) return;

      const talkCountInPeriod = talkCounts[mu.nickname] || 0;
      const hasLeftInPeriod = hasLeftInPeriodMap.has(mu.nickname);
      const hasAnyLeave = mu.leaveDates.length > 0;

      // Criteria: 0 talks in period, and no leave record ever
      if (talkCountInPeriod === 0 && !hasAnyLeave && !hasLeftInPeriod) {
        currentFoundGhosts.push(mu);
      }
    });

    ghostFinderCount.innerText = currentFoundGhosts.length;
    ghostResultsBody.innerHTML = '';

    const emptyStateEl = document.getElementById('ghost-finder-empty');
    const emptyStateText = document.getElementById('ghost-finder-empty-text');
    const tableWrapperEl = document.getElementById('ghost-finder-table-wrapper');

    if (currentFoundGhosts.length === 0) {
      if (emptyStateText) emptyStateText.innerText = '설정한 기간 동안 발굴된 Ghost of Ghost 유령 회원이 없습니다.';
      if (emptyStateEl) emptyStateEl.style.display = 'block';
      if (tableWrapperEl) tableWrapperEl.style.display = 'none';
      btnPurgeGhosts.setAttribute('disabled', 'true');
    } else {
      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (tableWrapperEl) tableWrapperEl.style.display = 'block';
      
      currentFoundGhosts.forEach(g => {
        const tr = document.createElement('tr');
        tr.classList.add('fade-in-row');
        const joinDate = g.absoluteJoinDate || g.absoluteFirstTalkDate || '기록 없음';
        tr.innerHTML = `
          <td><strong>${escapeHtml(g.nickname)}</strong></td>
          <td>${joinDate}</td>
          <td>없음</td>
          <td>0회</td>
          <td><span class="dormant-badge ghost-of-ghost"><i class="fa-solid fa-ghost"></i> 유령</span></td>
        `;
        ghostResultsBody.appendChild(tr);
      });
      btnPurgeGhosts.removeAttribute('disabled');
    }
  });

  btnPurgeGhosts.addEventListener('click', () => {
    if (currentFoundGhosts.length === 0) return;
    playSfClickSound();
    
    if (confirm(`발굴된 유령 회원 ${currentFoundGhosts.length}명을 분석 데이터에서 완전히 제거하시겠습니까?\n이 작업은 대시보드와 차트를 즉시 갱신합니다.`)) {
      currentFoundGhosts.forEach(g => {
        purgedGhosts.add(g.nickname);
      });
      
      currentFoundGhosts = [];
      ghostFinderCount.innerText = '0';
      ghostResultsBody.innerHTML = '';
      if (emptyStateText) emptyStateText.innerText = '유령 회원이 성공적으로 제거되었습니다. 대시보드를 갱신합니다.';
      if (emptyStateEl) emptyStateEl.style.display = 'block';
      if (tableWrapperEl) tableWrapperEl.style.display = 'none';
      btnPurgeGhosts.setAttribute('disabled', 'true');
      
      updatePurgedSection();
      startAnalysis();
    }
  });

  btnRestoreGhosts.addEventListener('click', () => {
    if (purgedGhosts.size === 0) return;
    playSfClickSound();
    
    if (confirm('제거된 모든 유령 회원을 다시 대화 분석 데이터로 복구하시겠습니까?')) {
      purgedGhosts.clear();
      updatePurgedSection();
      startAnalysis();
    }
  });

  function updatePurgedSection() {
    const section = document.getElementById('purged-ghosts-section');
    const countEl = document.getElementById('purged-ghosts-count');
    const listEl = document.getElementById('purged-ghosts-list');
    
    if (!section || !countEl || !listEl) return;
    
    if (purgedGhosts.size === 0) {
      section.style.display = 'none';
    } else {
      section.style.display = 'block';
      countEl.innerText = purgedGhosts.size;
      listEl.innerHTML = Array.from(purgedGhosts)
        .map(name => `<span class="purged-name-tag" style="display: inline-block; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); padding: 2px 6px; margin: 3px; border-radius: 4px; color: var(--pink); font-size: 11px;">${escapeHtml(name)}</span>`)
        .join(' ');
    }
  }

  function formatInputDate(dateStr) {
    const matches = dateStr.match(/\d+/g);
    if (!matches || matches.length < 3) return '';
    const y = matches[0];
    const m = matches[1].padStart(2, '0');
    const d = matches[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

// ----------------------------------------------------
// Topic Explorer Modal Module
// ----------------------------------------------------
let explorerActiveCategory = 'ALL';
let explorerActiveTab = 'overview';
let explorerTargetLogs = [];
let explorerCatStats = {};
let explorerActiveTag = null;

function openTopicExplorer(catId = 'ALL') {
  const modal = document.getElementById('topic-explorer-modal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  // Reset active tab to 'overview' to align with UI defaults
  explorerActiveTab = 'overview';
  document.querySelectorAll('.explorer-panel').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.explorer-main .tabs .tab').forEach(el => el.classList.remove('active'));
  
  const overviewPanel = document.getElementById('exp-panel-overview');
  const overviewTabBtn = document.getElementById('exp-tab-btn-overview');
  if (overviewPanel) overviewPanel.style.display = 'block';
  if (overviewTabBtn) overviewTabBtn.classList.add('active');

  // Render sidebar buttons dynamically if not already populated
  renderExplorerSidebar();

  // Reset tag filters and load active category data
  filterExplorerCat(catId);
}

function renderExplorerSidebar() {
  const list = document.getElementById('explorerCatNavList');
  if (!list) return;

  list.innerHTML = TAXONOMY.map(cat => {
    return `
      <button class="cat-btn" id="exp-btn-${cat.id}" onclick="filterExplorerCat('${cat.id}')">
        <span class="cat-dot" style="background:${cat.color};"></span>
        ${cat.label}
        <span class="cat-count" id="exp-cnt-${cat.id}">0</span>
      </button>
    `;
  }).join('');
}

function filterExplorerCat(catId) {
  explorerActiveCategory = catId;
  explorerActiveTag = null; // Reset tag filter on category switch

  // Toggle active styling on sidebar buttons
  document.querySelectorAll('#topic-explorer-modal .explorer-sidebar .cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`exp-btn-${catId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Calculate target logs (only filtered active users or selected user)
  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  explorerTargetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  // Compute category count stats
  explorerCatStats = {};
  TAXONOMY.forEach(cat => { explorerCatStats[cat.id] = 0; });
  
  explorerTargetLogs.forEach(log => {
    if (log.type === 'talk' && log.content) {
      const catId = log.category || 'ETC';
      if (explorerCatStats[catId] !== undefined) {
        explorerCatStats[catId]++;
      }
    }
  });

  // Update category count badges in the sidebar
  const totalLogs = explorerTargetLogs.length;
  const allCntEl = document.getElementById('exp-cnt-ALL');
  if (allCntEl) allCntEl.textContent = totalLogs.toLocaleString();
  TAXONOMY.forEach(cat => {
    const cntEl = document.getElementById(`exp-cnt-${cat.id}`);
    if (cntEl) cntEl.textContent = (explorerCatStats[cat.id] || 0).toLocaleString();
  });

  // Update Overview stats card
  const activeCnt = catId === 'ALL' ? totalLogs : (explorerCatStats[catId] || 0);
  const pct = totalLogs > 0 ? Math.round((activeCnt / totalLogs) * 100) : 0;

  const msgsEl = document.getElementById('exp-stat-cat-msgs');
  if (msgsEl) msgsEl.textContent = activeCnt.toLocaleString();
  const pctEl = document.getElementById('exp-stat-cat-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;
  
  let tagCount = 0;
  if (catId === 'ALL') {
    tagCount = TAXONOMY.reduce((sum, cat) => sum + cat.subs.reduce((s, sub) => s + sub.tags.length, 0), 0);
  } else {
    const cat = TAXONOMY.find(c => c.id === catId);
    tagCount = cat ? cat.subs.reduce((sum, sub) => sum + sub.tags.length, 0) : 0;
  }
  const tagsEl = document.getElementById('exp-stat-cat-tags');
  if (tagsEl) tagsEl.textContent = tagCount.toLocaleString();

  // Lazy render: Only update the currently active tab
  renderActiveExplorerTab();
}

function filterExplorerByTag(tag) {
  explorerActiveTag = tag;
  
  // Find category containing this tag
  let foundCatId = 'ALL';
  for (const cat of TAXONOMY) {
    const allTags = cat.subs.flatMap(s => s.tags);
    if (allTags.includes(tag)) {
      foundCatId = cat.id;
      break;
    }
  }

  // Focus sidebar category
  explorerActiveCategory = foundCatId;

  // Toggle active styling on sidebar buttons
  document.querySelectorAll('#topic-explorer-modal .explorer-sidebar .cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`exp-btn-${foundCatId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Calculate target logs
  const selectedMember = document.getElementById('chart-member-select')?.value || 'all';
  const filteredUsersMap = new Set(getFilteredUsers().map(u => u.nickname));
  explorerTargetLogs = selectedMember === 'all' 
    ? chatLogs.filter(log => log.nickname && filteredUsersMap.has(log.nickname)) 
    : chatLogs.filter(log => log.nickname === selectedMember);

  // Compute category count stats (for sidebar updates)
  explorerCatStats = {};
  TAXONOMY.forEach(cat => { explorerCatStats[cat.id] = 0; });
  
  explorerTargetLogs.forEach(log => {
    if (log.type === 'talk' && log.content) {
      const catId = log.category || 'ETC';
      if (explorerCatStats[catId] !== undefined) {
        explorerCatStats[catId]++;
      }
    }
  });

  // Update category count badges in the sidebar
  const totalLogs = explorerTargetLogs.length;
  const allCntEl = document.getElementById('exp-cnt-ALL');
  if (allCntEl) allCntEl.textContent = totalLogs.toLocaleString();
  TAXONOMY.forEach(cat => {
    const cntEl = document.getElementById(`exp-cnt-${cat.id}`);
    if (cntEl) cntEl.textContent = (explorerCatStats[cat.id] || 0).toLocaleString();
  });

  // Update Overview stats card
  const activeCnt = foundCatId === 'ALL' ? totalLogs : (explorerCatStats[foundCatId] || 0);
  const pct = totalLogs > 0 ? Math.round((activeCnt / totalLogs) * 100) : 0;

  const msgsEl = document.getElementById('exp-stat-cat-msgs');
  if (msgsEl) msgsEl.textContent = activeCnt.toLocaleString();
  const pctEl = document.getElementById('exp-stat-cat-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;
  
  let tagCount = 0;
  if (foundCatId === 'ALL') {
    tagCount = TAXONOMY.reduce((sum, cat) => sum + cat.subs.reduce((s, sub) => s + sub.tags.length, 0), 0);
  } else {
    const cat = TAXONOMY.find(c => c.id === foundCatId);
    tagCount = cat ? cat.subs.reduce((sum, sub) => sum + sub.tags.length, 0) : 0;
  }
  const tagsEl = document.getElementById('exp-stat-cat-tags');
  if (tagsEl) tagsEl.textContent = tagCount.toLocaleString();

  // Transition view panel to messages list tab
  showExplorerTab('messages');
}

function drawExplorerCharts(targetLogs, catStats) {
  const donutCanvas = document.getElementById('expDonutCanvas');
  const barCanvas = document.getElementById('expBarCanvas');
  const timelineCanvas = document.getElementById('expTimelineCanvas');

  if (!donutCanvas || !barCanvas || !timelineCanvas) return;

  const totalMsgs = TAXONOMY.reduce((sum, cat) => sum + (catStats[cat.id] || 0), 0) || 1;

  // Donut Chart
  if (charts.expDonut) charts.expDonut.destroy();
  charts.expDonut = new Chart(donutCanvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: TAXONOMY.map(cat => cat.label),
      datasets: [{
        data: TAXONOMY.map(cat => catStats[cat.id] || 0),
        backgroundColor: TAXONOMY.map(cat => cat.color),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      cutout: '70%'
    }
  });

  // Render custom Legend
  const legendEl = document.getElementById('expDonutLegend');
  if (legendEl) {
    legendEl.innerHTML = TAXONOMY.map(cat => {
      const cnt = catStats[cat.id] || 0;
      const pct = totalMsgs > 0 ? Math.round((cnt / totalMsgs) * 100) : 0;
      return `
        <div class="exp-legend-item" style="cursor: pointer;" onclick="filterExplorerCat('${cat.id}')">
          <span class="exp-legend-dot" style="background:${cat.color}"></span>
          <span style="font-weight: 500; font-size:11px;">${cat.label}</span>
          <span style="margin-left: auto; color: var(--text-main); font-weight: 600;">${pct}%</span>
          <span style="margin-left: 6px; color: var(--text-muted); font-size: 8px;">(${cnt}건)</span>
        </div>
      `;
    }).join('');
  }

  // Bar Chart
  if (charts.expBar) charts.expBar.destroy();
  charts.expBar = new Chart(barCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: TAXONOMY.map(cat => cat.label.slice(0, 4)),
      datasets: [{
        data: TAXONOMY.map(cat => catStats[cat.id] || 0),
        backgroundColor: TAXONOMY.map(cat => cat.color),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 8 } } }
      }
    }
  });

  // Timeline Chart
  const yearStats = {};
  targetLogs.forEach(log => {
    if (log.type === 'talk' && log.date) {
      const year = log.date.substring(0, 4);
      if (!yearStats[year]) {
        yearStats[year] = {};
        TAXONOMY.forEach(cat => { yearStats[year][cat.id] = 0; });
      }
      const catId = log.category || 'ETC';
      if (yearStats[year][catId] !== undefined) {
        yearStats[year][catId]++;
      }
    }
  });

  const years = Object.keys(yearStats).sort();
  if (charts.expTimeline) charts.expTimeline.destroy();

  const datasets = TAXONOMY.slice(0, 5).map(cat => {
    return {
      label: cat.label,
      data: years.map(y => yearStats[y][cat.id] || 0),
      borderColor: cat.color,
      backgroundColor: cat.color + '15',
      tension: 0.3,
      borderWidth: 1.5,
      pointRadius: 2
    };
  });

  charts.expTimeline = new Chart(timelineCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: years,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#f3f4f6', boxWidth: 10, font: { family: 'Outfit', size: 9 } }
        },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#f3f4f6',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { size: 9 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { size: 9 } } }
      }
    }
  });
}

function renderExplorerTagCloud(targetLogs, activeCatId) {
  const tagCounts = {};
  
  TAXONOMY.forEach(cat => {
    cat.subs.forEach(sub => {
      sub.tags.forEach(tag => {
        tagCounts[tag] = 0;
      });
    });
  });

  targetLogs.forEach(log => {
    if (log.type === 'talk' && log.matchedTags) {
      log.matchedTags.forEach(tag => {
        if (tagCounts[tag] !== undefined) {
          tagCounts[tag]++;
        }
      });
    }
  });

  let tagsToRender = [];
  if (activeCatId === 'ALL') {
    tagsToRender = Object.entries(tagCounts)
      .filter(([tag, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80);
  } else {
    const cat = TAXONOMY.find(c => c.id === activeCatId);
    if (cat) {
      const catTags = cat.subs.flatMap(sub => sub.tags);
      tagsToRender = catTags.map(tag => [tag, tagCounts[tag] || 0]).sort((a, b) => b[1] - a[1]);
    }
  }

  const maxVal = Math.max(...tagsToRender.map(t => t[1]), 1);
  const cloudEl = document.getElementById('expTagCloud');
  const titleEl = document.getElementById('expTagCloudTitle');

  if (!cloudEl || !titleEl) return;

  if (activeCatId === 'ALL') {
    titleEl.textContent = '태그 클라우드 (전체)';
  } else {
    const catLabel = TAXONOMY.find(c => c.id === activeCatId)?.label || activeCatId;
    titleEl.textContent = `태그 클라우드 · ${catLabel}`;
  }

  if (tagsToRender.length === 0) {
    cloudEl.innerHTML = `<div style="padding:20px; color:var(--text-dark); text-align:center; font-size:12px; width:100%;">매칭된 태그가 없습니다.</div>`;
    return;
  }

  cloudEl.innerHTML = tagsToRender.map(([tag, count]) => {
    const size = 11 + Math.floor(10 * (count / maxVal));
    const opacity = 0.5 + 0.5 * (count / maxVal);
    return `
      <span class="tag" style="font-size:${size}px; opacity:${opacity}; cursor:pointer;" onclick="filterExplorerByTag('${tag}')">
        ${tag}<span class="cnt" style="margin-left: 4px; font-size: 0.8em; opacity: 0.7;">(${count})</span>
      </span>
    `;
  }).join('');
}

function renderExplorerDetails(targetLogs, activeCatId) {
  const detailArea = document.getElementById('expCatDetailArea');
  if (!detailArea) return;
  
  const catStats = {};
  const subStats = {};
  const tagCounts = {};

  TAXONOMY.forEach(cat => {
    catStats[cat.id] = 0;
    cat.subs.forEach(sub => {
      subStats[sub.id] = 0;
      sub.tags.forEach(tag => {
        tagCounts[tag] = 0;
      });
    });
  });

  targetLogs.forEach(log => {
    if (log.type === 'talk') {
      const catId = log.category || 'ETC';
      const subId = log.subcategory || 'UNCLASSIFIED';
      if (catStats[catId] !== undefined) {
        catStats[catId]++;
      }
      if (subStats[subId] !== undefined) {
        subStats[subId]++;
      }
      if (log.matchedTags) {
        log.matchedTags.forEach(tag => {
          if (tagCounts[tag] !== undefined) {
            tagCounts[tag]++;
          }
        });
      }
    }
  });

  const catsToRender = activeCatId === 'ALL'
    ? TAXONOMY
    : TAXONOMY.filter(cat => cat.id === activeCatId);

  const totalLogs = targetLogs.length || 1;

  detailArea.innerHTML = catsToRender.map(cat => {
    const catCnt = catStats[cat.id] || 0;
    const catPct = Math.round((catCnt / totalLogs) * 100);
    return `
      <div class="exp-cat-detail" style="border-left: 4px solid ${cat.color};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <h2 style="color:${cat.color};">${cat.label}</h2>
          <span style="font-size:11px; color:var(--text-muted);">${cat.id}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
          메시지 수: <strong style="color:var(--text-main);">${catCnt}건</strong> (${catPct}%)
        </div>
        <ul class="exp-sub-list">
          ${cat.subs.map(sub => {
            const subCnt = subStats[sub.id] || 0;
            return `
              <li class="exp-sub-item">
                <div class="exp-sub-name">
                  ${sub.label}
                  <span class="exp-sub-badge">${subCnt}건</span>
                </div>
                <div class="tag-cloud" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                  ${sub.tags.map(tag => {
                    const tCnt = tagCounts[tag] || 0;
                    return `
                      <span class="tag" style="cursor:pointer;" onclick="filterExplorerByTag('${tag}')">
                        ${tag}<span class="cnt" style="margin-left:4px; font-size:0.8em; opacity:0.7;">(${tCnt})</span>
                      </span>
                    `;
                  }).join('')}
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function renderExplorerTaxonomy() {
  const taxonomyView = document.getElementById('expTaxonomyView');
  if (!taxonomyView) return;
  
  taxonomyView.innerHTML = TAXONOMY.map(cat => `
    <div class="exp-cat-detail" style="border-left: 4px solid ${cat.color};">
      <h2 style="color:${cat.color};">${cat.label}</h2>
      <p style="color:var(--text-muted); font-size:11px; margin-bottom:12px;">
        ${cat.subs.length}개 소분류 · ${cat.subs.reduce((acc, sub) => acc + sub.tags.length, 0)}개 태그
      </p>
      <ul class="exp-sub-list">
        ${cat.subs.map(sub => `
          <li class="exp-sub-item">
            <div class="exp-sub-name" style="font-weight:600;">
              ${sub.label} <span class="exp-sub-badge">${sub.tags.length}개 태그</span>
            </div>
            <div class="tag-cloud" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
              ${sub.tags.map(tag => `<span class="tag" style="cursor:default;">${tag}</span>`).join('')}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function renderExplorerMessages(targetLogs, filterTag = null) {
  const bodyEl = document.getElementById('exp-message-list-body');
  const titleEl = document.getElementById('exp-message-list-title');
  const countEl = document.getElementById('exp-message-list-count');

  if (!bodyEl || !titleEl || !countEl) return;

  let filteredLogs = targetLogs;
  if (filterTag) {
    const lowerTag = filterTag.toLowerCase();
    filteredLogs = targetLogs.filter(log => log.type === 'talk' && log.content && log.content.toLowerCase().includes(lowerTag));
    titleEl.textContent = `메시지 목록 (태그: ${filterTag})`;
  } else {
    titleEl.textContent = '메시지 목록';
  }

  countEl.textContent = `${filteredLogs.length}건 발견됨`;

  if (filteredLogs.length === 0) {
    bodyEl.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-dark);">해당하는 메시지가 없습니다.</td></tr>`;
    return;
  }

  const limit = 500;
  const logsToRender = filteredLogs.slice(0, limit);

  bodyEl.innerHTML = logsToRender.map(log => {
    const dateStr = log.date && log.timeStr ? `${log.date} ${log.timeStr}` : (log.timestamp ? formatDate(new Date(log.timestamp)) : '-');
    const catId = log.category || 'ETC';
    const subId = log.subcategory || 'UNCLASSIFIED';
    const categoryName = TAXONOMY.find(c => c.id === catId)?.label || catId;
    const subcategoryName = TAXONOMY.find(c => c.id === catId)?.subs.find(s => s.id === subId)?.label || subId;
    
    return `
      <tr>
        <td>${dateStr}</td>
        <td>${log.nickname || '-'}</td>
        <td>${escapeHtml(log.content)}</td>
        <td>
          <span style="color:${TAXONOMY.find(c => c.id === catId)?.color || '#fff'}; font-weight:600;">
            ${categoryName}
          </span>
          <span style="font-size:10px; color:var(--text-muted); display:block;">
            ${subcategoryName}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (filteredLogs.length > limit) {
    bodyEl.innerHTML += `
      <tr>
        <td colspan="4" style="text-align:center; padding:12px; color:var(--text-muted); font-size:11px; background:rgba(0,0,0,0.1);">
          데이터가 너무 많아 상위 ${limit}건만 표시합니다. (전체 ${filteredLogs.length}건)
        </td>
      </tr>
    `;
  }
}

function showExplorerTab(tabId) {
  explorerActiveTab = tabId;

  document.querySelectorAll('.explorer-panel').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.explorer-main .tabs .tab').forEach(el => el.classList.remove('active'));

  const activePanel = document.getElementById(`exp-panel-${tabId}`);
  const activeTabBtn = document.getElementById(`exp-tab-btn-${tabId}`);
  
  if (activePanel) activePanel.style.display = 'block';
  if (activeTabBtn) activeTabBtn.classList.add('active');

  // Trigger lazy rendering for the active tab
  renderActiveExplorerTab();
}

function renderActiveExplorerTab() {
  const catId = explorerActiveCategory;
  const targetLogs = explorerTargetLogs;
  const catStats = explorerCatStats;
  const tag = explorerActiveTag;

  if (explorerActiveTab === 'overview') {
    drawExplorerCharts(targetLogs, catStats);
    renderExplorerTagCloud(targetLogs, catId);
  } else if (explorerActiveTab === 'details') {
    renderExplorerDetails(targetLogs, catId);
  } else if (explorerActiveTab === 'taxonomy') {
    renderExplorerTaxonomy();
  } else if (explorerActiveTab === 'messages') {
    const catFilterLogs = catId === 'ALL'
      ? targetLogs
      : targetLogs.filter(log => log.type === 'talk' && log.content && log.category === catId);
    renderExplorerMessages(catFilterLogs, tag);
  }
}



