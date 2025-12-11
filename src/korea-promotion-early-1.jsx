import { useState, useEffect, useRef } from "react";
import { db, collection, addDoc } from "./firebaseConfig"; // firebase 인증 모듈 불러오기


export default function WritingTest() {
  const sections = [
    "해외 방문객에 대한 인사말 (10단어 이상)",
    "대한민국의 매력1",
    "대한민국의 매력2",
    "대한민국의 매력3",
    "대한민국의 매력4"
  ];

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTexts, setSectionTexts] = useState(["", "", "", "", ""]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false); // AI 애니메이션 조건 제어용

  const [displayText, setDisplayText] = useState("");
  const predefinedText1 = "한국은 뚜렷한 사계절이 특징입니다. 봄과 가을에는 쾌적한 날씨가 이어지며 야외 활동이나 여행하기에 완벽합니다. 여름에는 푸른 바다를, 겨울에는 전국 어디에서나 눈과 얼음을 볼 수 있어 다양한 계절의 아름다움을 만끽할 수 있습니다. "; // 미리 정해진 문장 삽입

  // 선택된 예시 문장을 담을 상태
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(null);
  const [showExampleChoice, setShowExampleChoice] = useState(false);
  const [predefinedText, setPredefinedText] = useState("");

  const [preTextIndex, setPreTextIndex] = useState(0);
  const [isPreTextTyping, setIsPreTextTyping] = useState(false); // 타이핑 중인 글자 저장
  const [preTextTyping, setPreTextTyping] = useState("");   // 타이핑 중인 글자

  const typingText = "...DraftMind가 입력중 입니다..."; //입력중
  const hello = "안녕하세요! 저는 글쓰기 전문 AI 'DraftMind'에요. \n지금 '해외 방문객에게 대한민국을 알리는 홍보글'을 쓰고 계시네요."; // 인사말
  const fullText = "홍보글 초반부를 작성하고 계시는군요. '대한민국의 매력 1' 파트는 제가 도와드릴게요."; // AI 글쓰기 제안문구
  const endingText = "\n\n위와 같이 '대한민국의 매력 1' 파트를 작성해보았어요. \n위의 초록색 '다음 파트로 넘어가기' 버튼을 눌러 홍보글을 이어서 작성해주세요.";

  const [typingIndex, setTypingIndex] = useState(0);
  const [helloIndex, setHelloIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);
  const [isEndingTyping, setIsEndingTyping] = useState(false); // endingText 타이핑 시작 여부
  const [endingIndex, setEndingIndex] = useState(0); // endingText 타이핑 인덱스

  // 예시문장 타이핑 상태 추가
  const [exampleTypingIndex, setExampleTypingIndex] = useState(0);
  const [exampleTypingTexts, setExampleTypingTexts] = useState([""]);
  const [isExampleTyping, setIsExampleTyping] = useState(false);
  const [showExampleContainer, setShowExampleContainer] = useState(false); // 🔥 예시 선택박스 표시 여부

  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isHelloTyping, setIsHelloTyping] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showInputLockMessage, setShowInputLockMessage] = useState(false);

  const [warning, setWarning] = useState([]);

  const [isPressed, setIsPressed] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  // 참가자가 입력한 글 지우기 상태 추가
  const [isErasing, setIsErasing] = useState(false);
  const [eraseIndex, setEraseIndex] = useState(0);
  const [startErasing, setStartErasing] = useState(false);  // 지우기 잠시 대기
  
  const [hasInsertedExample, setHasInsertedExample] = useState(false);

  const isAiTypingInProgress = () => {
    if (!hasTriggeredOnce) return false;
    return (
        isHelloTyping || 
        isFullTextTyping || 
        isExampleTyping || 
        isErasing || 
        isWaitingBeforePreTyping || 
        isPreTextTyping || 
        isEndingTyping || 
        !isTypingTextComplete
        );
  };
  const [isWaitingBeforePreTyping, setIsWaitingBeforePreTyping] = useState(false);

  const shouldShowNextButton = () => {
    if (currentSectionIndex !== 1) return true;

    // 1차 등장: 30단어 이상이면 나타나야 함
    if (!hasTriggeredOnce && currentWordCount >= 30) return true;

    // 2차 등장: 모든 AI 흐름 끝난 뒤 다시 등장
    return (
      !isEndingTyping &&
      endingIndex >= endingText.length &&
      hasInsertedExample
    );
  };


  // 섹션 진행률 표시
  const progressRatio = (currentSectionIndex + 1) / sections.length;
  

  // 패널 아이디 상태
  const [panelId, setPanelId] = useState(null);  

  // 전화번호 입력 상태 추가
//  const [phoneNumber, setPhoneNumber] = useState("");


  // 마운트 시 1회 URL 파라미터에서 panel_id 추출
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("panel_id");
    setPanelId(pid);
  }, []);

  // 🔥 입력 잠금 메시지 상태 추가
  useEffect(() => {
    setShowInputLockMessage(isInputDisabled);
  }, [isInputDisabled]);

  // ⛔ 붙여넣기/드롭/단축키 차단 핸들러
  const preventPaste = (e) => {
    e.preventDefault();
    alert("붙여넣기는 허용되지 않습니다. 직접 입력해주세요.");
  };

  const preventKeyPaste = (e) => {
    const isPasteCombo =
      ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) ||
      (e.shiftKey && e.key === "Insert");
    if (isPasteCombo) {
      e.preventDefault();
      alert("붙여넣기는 허용되지 않습니다. 직접 입력해주세요.");
    }
  };

  const preventDrop = (e) => {
    // 드래그 앤 드롭으로 텍스트가 들어오는 것 차단
    e.preventDefault();
  };



  const handleChange = (value) => {
    if (currentSectionIndex >= sectionTexts.length) return;

    setCurrentInput(value);
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
    setCurrentWordCount(wordCount);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열




  
    // 입력이 비어 있으면 즉시 종료
    if (value.trim().length === 0) {
      setWarning([]);
      return;
    }


    // ---------- 반복 탐지 시작 ----------
    // 0) 토큰화 (공백 기준)
    const rawTokens = value.trim().split(/\s+/).filter(Boolean);

    // 1) 토큰 정규화 함수
    //    - 특수문자만 있는 토큰: 같은 글자 반복을 1개로 축약 (!!!! -> !)
    //    - 한 글자만 반복(ㅋㅋㅋㅋ, ㅎㅎㅎ): 해당 글자 1개로 축약 (ㅋㅋㅋㅋ -> ㅋ)
    //    - 일반 단어: 앞뒤 문장부호만 제거하고, 소문자화
    const normalizeToken = (t) => {
      // 전부 기호/문장부호?
      if (/^[\p{P}\p{S}]+$/u.test(t)) {
        return t.replace(/(.)\1+/gu, "$1");
      }
      // 같은 글자만 반복된 경우
      const onlyOneCharRepeated = /^(.)(\1+)$/u.exec(t);
      if (onlyOneCharRepeated) return onlyOneCharRepeated[1];
      // 일반 단어: 앞뒤 문장부호 제거
      const stripped = t.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
      return stripped.toLowerCase();
    };

    const normTokens = rawTokens.map(normalizeToken).filter(Boolean);

    // 2) 토큰 빈도 기반 과다 반복 (예: 동일 토큰 5회 이상)
    const OVERUSE = 5;
    const freq = {};
    for (const w of normTokens) freq[w] = (freq[w] || 0) + 1;
    const overusedKeys = Object.entries(freq)
      .filter(([, c]) => c >= OVERUSE)
      .map(([k]) => k);

    // 3) 문자 레벨 장문 반복(공백 제거 후 같은 문자 8회 이상 연속)
    const noSpace = value.replace(/\s+/g, "");
    const longRuns = noSpace.match(/([\p{L}\p{N}\p{P}\p{S}])\1{7,}/gu) || [];
    const longRunChars = [...new Set(longRuns.map((s) => s[0]))];

    // 4) 경고 메시지 구성 (특수문자는 보기 좋게 라벨링)
    const label = (w) =>
      /^[\p{P}\p{S}]+$/u.test(w) ? `특수문자 '${w}'` : `'${w}'`;

    if (normTokens.length > 5 && overusedKeys.length > 0) {
      warningMessages.push(
        `같은 단어의 과도한 반복이 감지되었습니다: ${overusedKeys
          .map(label)
          .join(", ")} , 삭제 후 정상적으로 글을 작성하면, 다음 파트로 넘어가실 수 있습니다.`
      );
    }
    if (longRunChars.length > 0) {
      warningMessages.push(
        `공백을 제외하고 동일 문자 연속 반복(8회 이상)이 감지되었습니다: ${longRunChars
          .map(label)
          .join(", ")} , 삭제 후 정상적으로 글을 작성하면, 다음 파트로 넘어가실 수 있습니다.`
      );
    }
    // ---------- 반복 탐지 끝 ----------


    // 5) 의미 없는 입력(키보드 난타) 탐지 -----------------------------
    // 한국어 자모만으로 이뤄진 토큰? (예: ㅋ, ㅎㅎ, ㅏㅏㅏ)
    const jamoOnlyRe = /^[\u1100-\u11FF\u3130-\u318F]+$/u;
    // 한국어 완성형 음절 포함?
    const hasHangulSyllableRe = /[\uAC00-\uD7A3]/u;
    // 한국어 조사/어미로 끝나는 토큰 (아주 간단한 휴리스틱)
    const josaEndingRe = /[\uAC00-\uD7A3]+(은|는|이|가|의|을|를|에|에서|으로|와|과|도|만|까지|부터|으로서|으로써|랑|하고|이며|입니다|이다|합니다|하다|이에요|예요|였|였다|했다|였습니다|했습니다)$/u;

    // 원본 토큰(공백 기준)으로 지표 계산
    const totalTokens = rawTokens.length;
    let shortCnt = 0;       // 1~2글자 토큰 수
    let jamoOnlyCnt = 0;    // 자모만 토큰 수
    let hangulSyllCnt = 0;  // 완성형 한글 포함 토큰 수
    let josaLikeCnt = 0;    // 조사/어미로 끝나는 토큰 수

    rawTokens.forEach((t) => {
      const len = t.length;
      if (len <= 2) shortCnt += 1;
      if (jamoOnlyRe.test(t)) jamoOnlyCnt += 1;
      if (hasHangulSyllableRe.test(t)) hangulSyllCnt += 1;
      if (josaEndingRe.test(t)) josaLikeCnt += 1;
    });


    // --- 영어 난타 감지 도우미(정의는 사용보다 위에 있어야 함) ---
    const EN_ALPHA = /^[A-Za-z]+$/;                         // 영문만
    const EN_CONSONANT_RUN = /[bcdfghjklmnpqrstvwxyz]{4,}/i; // 자음 4연속 이상
    const EN_MIXED_PUNCT = /[A-Za-z]+[^A-Za-z\s]+[A-Za-z]+/; // 단어 중간에 기호 끼임

    // 오탐 줄이는 간단 화이트리스트 (필요시 수정/추가)
    const EN_WHITELIST = new Set([
      "the","a","an","and","to","of","for","in","on","with","at","from","by","is","are","this","that","it",
      "we","you","they","our","your","i","he","she","as","be","or","if","not","but","so",
      "Korea","welcome" 
    ]);

    const isEnglishSuspicious = (t) => {
      if (EN_MIXED_PUNCT.test(t)) return true;   // fo;b, op[w 등
      if (!EN_ALPHA.test(t)) return false;       // 영문이 아니면 패스

      const w = t.toLowerCase();
      if (EN_WHITELIST.has(w)) return false;

      if (EN_CONSONANT_RUN.test(w)) return true;           // 자음 4연속
      const vowels = (w.match(/[aeiouy]/g) || []).length;  // y를 모음 포함
      const vr = vowels / w.length;

      if (w.length <= 2) return true;
      if (w.length >= 4 && vr < 0.25) return true;         // 모음비율 매우 낮음
      if (w.length >= 8 && vr < 0.30) return true;

      return false;
    };


    // 비율
    const shortRatio = totalTokens ? shortCnt / totalTokens : 0;
    const jamoOnlyRatio = totalTokens ? jamoOnlyCnt / totalTokens : 0;
    const hangulSyllRatio = totalTokens ? hangulSyllCnt / totalTokens : 0;

    // 섹션별 최소 단어 충족 수준에서만 검사(오탐 줄이기)
    const reachedMinWords =
      (currentSectionIndex === 0 && totalTokens >= 10) ||
      (currentSectionIndex > 0 && totalTokens >= 30);

    if (reachedMinWords) {
      // 임계치(필요에 따라 조절하세요)
      const SHORT_MAX = 0.70;      // 70% 이상이 1~2글자면 의심
      const JAMO_MAX  = 0.10;      // 10% 이상이 자모-only면 의심
      const HANGUL_MIN = 0.40;     // 완성형 한글 포함 비율이 40% 미만이면 의심
      const JOSA_MIN = 1;          // 조사/어미 토큰이 최소 1개는 있어야 자연스러움

      const suspiciousByLength = shortRatio >= SHORT_MAX;
      const suspiciousByJamo   = jamoOnlyRatio >= JAMO_MAX;
      const suspiciousByHangul = hangulSyllRatio < HANGUL_MIN;
      const suspiciousByJosa   = josaLikeCnt < JOSA_MIN;

      if (suspiciousByLength || suspiciousByJamo || (suspiciousByHangul && suspiciousByJosa)) {
        warningMessages.push(
          "무의미한 단어/글자의 반복이 감지되었습니다. 삭제 후 정상적으로 글을 작성하면, 다음 파트로 넘어가실 수 있습니다."
        );
      }

      // --- 영어 난타 의심 비율 ---
      const englishSuspiciousCnt = rawTokens.filter(isEnglishSuspicious).length;
      const englishSuspiciousRatio = totalTokens ? englishSuspiciousCnt / totalTokens : 0;

      // --- 영어 토큰 비율(영어만 작성 방지) ---
      const englishTokenCnt = rawTokens.filter((t) => EN_ALPHA.test(t)).length;
      const englishTokenRatio = totalTokens ? englishTokenCnt / totalTokens : 0;

      // 임계치 (필요시 조정)
      const EN_SUSPICIOUS_MAX = 0.30; // 의심 영어토큰 30% 이상이면 경고
      const ENGLISH_ONLY_MAX  = 0.80; // 전체의 80% 이상이 영어면 경고

      if (englishSuspiciousRatio >= EN_SUSPICIOUS_MAX) {
        warningMessages.push(
          `무의미한 영어 단어가 감지되었습니다. 삭제 후 정상적으로 글을 작성하면, 다음 파트로 넘어가실 수 있습니다.`
        );
      }

      if (englishTokenRatio >= ENGLISH_ONLY_MAX) {
        warningMessages.push(
          "영어로만 작성한 것으로 감지되었습니다. 과제 안내에 따라 한글로 작성해주세요."
        );
      }

    }


    // 🔥 중복 제거 후 경고 메시지 설정
    setWarning([...new Set(warningMessages)]);
  };

  // 입력중.. 문구 타이핑효과
  useEffect(() => {
    if (hasTriggeredOnce && !isTypingTextComplete && typingIndex < typingText.length) {
      const timer = setTimeout(() => {
        setDisplayText(typingText.slice(0, typingIndex + 1));
        setTypingIndex(typingIndex + 1);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (typingIndex === typingText.length && !isTypingTextComplete) {
      setTimeout(() => {
        setIsTypingTextComplete(true);
        setDisplayText(""); // 다음 메시지 시작 전 초기화
        setIsHelloTyping(true);
      }, 1000);
    }
  }, [typingIndex, isTypingTextComplete, hasTriggeredOnce]);

  // 인사말 타이핑효과
  useEffect(() => {
    if (isHelloTyping && helloIndex < hello.length) {
      const timer = setTimeout(() => {
        setDisplayText(hello.slice(0, helloIndex + 1));
        setHelloIndex(helloIndex + 1);
      }, 35);
      return () => clearTimeout(timer);
    }

    if (helloIndex === hello.length) {
      setTimeout(() => {
        setIsHelloTyping(false);
        setIsFullTextTyping(true);
      }, 1000);
    }
  }, [helloIndex, isHelloTyping]);

  // AI 글쓰기 제안문구 타이핑효과
  useEffect(() => {
    if (isFullTextTyping && fullTextIndex < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, fullTextIndex + 1));
        setFullTextIndex(fullTextIndex + 1);
      }, 35);

      return () => clearTimeout(timer);
    }
    if (isFullTextTyping && fullTextIndex >= fullText.length) {
      setTimeout(() => {
        setIsFullTextTyping(false);

        // 🔥 예시박스 먼저 등장시킴
        setShowExampleContainer(true);

        // 🔥 예시 문장 타이핑 시작
        setIsExampleTyping(true);
        setExampleTypingIndex(0);
        setExampleTypingTexts([""]);
      }, 500);
    }
  }, [fullTextIndex, isFullTextTyping]);
        

  // 예시 선택창 처리 핸들러
  const handleExampleChoice = () => {
    const chosenText = predefinedText1;

    setShowExampleChoice(false);
    setPredefinedText(chosenText); // 선택된 문장 저장
    setStartErasing(true);           // ✅ 지우기 시작 트리거!
    setIsInputDisabled(true);        // 입력창 잠금
    setHasInsertedExample(false);   // 🔥 여기 꼭 다시 false로 초기화
  };


  // 글 지우기 효과
  useEffect(() => {
    if (startErasing && !isFullTextTyping && !isPreTextTyping && !isErasing) {
      setIsErasing(true);
      setEraseIndex(currentInput.length);
      setStartErasing(false);  // 딱 한 번만 실행
    }
  }, [startErasing, isFullTextTyping, isPreTextTyping, isErasing]);

  useEffect(() => {
    if (isErasing && eraseIndex > 0) {
      const timer = setTimeout(() => {
        const newText = currentInput.slice(0, eraseIndex - 1);
        setCurrentInput(newText);
        setEraseIndex(eraseIndex - 1);
      }, 10);  // 지우는 속도

      return () => clearTimeout(timer);
    }

    if (isErasing && eraseIndex === 0) {
      setIsErasing(false);
      setIsWaitingBeforePreTyping(true); // ✅ 대기 상태 ON

      // ✨ 1초 후에 예시문 입력 시작
      setTimeout(() => {
        setIsPreTextTyping(false);
        setCurrentInput(predefinedText); // 지운 후에 선택한 예시문장 입력
        setIsEndingTyping(true); // 마지막 멘트 타이핑 시작
      }, 300); // 1초 후에 타이핑 시작
    }

  }, [isErasing, eraseIndex]);

  const currentExampleIndexRef = useRef(0);  // 현재 몇 번째 문장
  const charIndexRef = useRef(0);            // 해당 문장에서 몇 번째 글자

  // 예시 문장 선택창에서 타이핑효과
  useEffect(() => {
    if (!isExampleTyping) return;

    const examples = [
      predefinedText1,
    ];

    const typeChar = () => {
      const currentIdx = currentExampleIndexRef.current;
      const charIdx = charIndexRef.current;

      if (currentIdx >= examples.length) {
        setIsExampleTyping(false);
        setShowExampleChoice(true); // ✅ 타이핑이 끝난 후에만 선택지 버튼 등장
        return;
      }

      const currentText = examples[currentIdx];

      if (charIdx <= currentText.length) {
        setExampleTypingTexts((prev) => {
          const updated = [...prev];
          updated[currentIdx] = currentText.slice(0, charIdx);
          return updated;
        });

        charIndexRef.current += 1;
        setTimeout(typeChar, 20); 
      } else {
        currentExampleIndexRef.current += 1;
        charIndexRef.current = 0;
        setTimeout(typeChar, 500); // 다음 문장 전 여유 시간
      }
    };

    typeChar();
  }, [isExampleTyping]);

  // 작성된 글 지우기
  const triggerAIHelp = () => {
    setTypingIndex(0);
    setHelloIndex(0);
    setFullTextIndex(0);
    setPreTextIndex(0);
    setPreTextTyping("");
    setIsTypingTextComplete(false);
    setIsHelloTyping(false);
    setIsFullTextTyping(false);
    setIsPreTextTyping(false);
    setIsEndingTyping(false);
    setEndingIndex(0);
    setHasInsertedExample(false); 

    setHasTriggeredOnce(true);  // 🔥 이 줄 꼭 필요!
    setIsInputDisabled(true);  // ✅ 추가!
  };


  // 예시문장 타이핑 종료 후 처리
  useEffect(() => {
    if (isPreTextTyping && preTextIndex < predefinedText.length) {
      const timer = setTimeout(() => {
        setPreTextTyping((prev) => prev + predefinedText[preTextIndex]);
        setPreTextIndex(preTextIndex + 1);
      }, 35);
      return () => clearTimeout(timer);
    }

    // 🔥 타이핑이 끝났을 때 currentInput에 저장!
    if (isPreTextTyping && preTextIndex === predefinedText.length) {
      setIsPreTextTyping(false);
      setCurrentInput(predefinedText);  
      setIsEndingTyping(true);          // 마지막 멘트 타이핑 시작
    }
  }, [isPreTextTyping, preTextIndex, predefinedText]);



  // 마무리멘트(endtiming) 타이핑효과
  useEffect(() => {
    if (isEndingTyping && endingIndex < endingText.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + endingText[endingIndex]);
        setEndingIndex(endingIndex + 1);
      }, 35);
      return () => clearTimeout(timer);
    }

    if (isEndingTyping && endingIndex >= endingText.length) {
      setIsEndingTyping(false); // 완료 후 종료

      setTimeout(() => {
        setHasInsertedExample(true);
      }, 1000);  // 1초 후 버튼 활성화
    }
  }, [isEndingTyping, endingIndex, endingText.length]);


  useEffect(() => {
    if (
      !isEndingTyping &&
      endingIndex >= endingText.length &&
      hasTriggeredOnce &&
      !hasInsertedExample
    ) {
      setHasInsertedExample(true);
    }
  }, [
    isEndingTyping,
    endingIndex,
    hasTriggeredOnce,
    hasInsertedExample
  ]);


    // 🔧 안전하게 endingText가 모두 끝났는지 체크하는 로직
  useEffect(() => {
    if (
      hasTriggeredOnce &&
      !isHelloTyping &&
      !isFullTextTyping &&
      !isExampleTyping &&
      !isErasing &&
      !isWaitingBeforePreTyping &&
      !isPreTextTyping &&
      !isEndingTyping &&
      endingIndex >= endingText.length &&
      !hasInsertedExample
    ) {
      setHasInsertedExample(true);
    }
  }, [
    hasTriggeredOnce,
    isHelloTyping,
    isFullTextTyping,
    isExampleTyping,
    isErasing,
    isWaitingBeforePreTyping,
    isPreTextTyping,
    isEndingTyping,
    endingIndex,
    hasInsertedExample
  ]);


  // AI 흐름 완료 후 다음 섹션으로 넘어가기
  const moveToNextSection = () => {
    const updated = [...sectionTexts];
    updated[currentSectionIndex] = currentInput;
    setSectionTexts(updated);

    setCurrentInput("");
    setCurrentWordCount(0);
    setCurrentSectionIndex(currentSectionIndex + 1);
    setIsInputDisabled(false);
    setHasTriggeredOnce(false);
  };

  
  // 섹션 전환
  const handleNextSection = () => {
    const updated = [...sectionTexts];
    updated[currentSectionIndex] = currentInput;
    setSectionTexts(updated);

    // ✅ 오직 2번 섹션(=index 1)이 끝났을 때만 AI 흐름 시작
    if (currentSectionIndex === 1) {
      // 👇 이미 AI 출력이 완료된 경우 → 다음 섹션으로 이동
      if (!isHelloTyping && !isFullTextTyping && !isPreTextTyping && !isErasing && !isEndingTyping && hasTriggeredOnce) {
        moveToNextSection();  // ✅ 한 번만 실행
        return;
      }

      // 👇 아직 AI 흐름 시작 전이라면 triggerAIHelp 실행
      if (!hasTriggeredOnce) {
        triggerAIHelp();  // ✨ 최초 1회만 실행
      }
      
      return;  // AI 흐름 중일 땐 아무 것도 하지 않음
    }

    // ✅ 섹션 1,3,4,5는 그냥 넘어감
    if (currentSectionIndex < sections.length - 1) {
      setCurrentInput("");
      setCurrentWordCount(0);
      setCurrentSectionIndex(currentSectionIndex + 1);
      setIsInputDisabled(false);
   } else {
      setCurrentInput("");
      setCurrentWordCount(0);
      alert("✉️ 홍보글 작성이 완료되었습니다! 하단의 제출 버튼을 눌러주세요.");
    }
  };

  // 🔥 Firestore에 데이터 저장하는 함수 추가
  const handleFinalSubmit = async () => {
    let errorMessages = []; 

    // 🔥 마지막 currentInput을 sectionTexts에 반영
    const updated = [...sectionTexts];
    updated[currentSectionIndex] = currentInput;
    setSectionTexts(updated);

    const fullText = updated.join("\n"); // ← 반영된 텍스트 기준으로 재정의
    const totalWordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

    // 조건 1: 전화번호가 비어 있으면 제출 막기
//    if (!phoneNumber.trim()) {
//      errorMessages.push("❌ 전화번호를 입력해주세요.");
//    }
    // 전화번호 형식 검사
//    else if (!/^010-\d{4}-\d{4}$/.test(phoneNumber.trim())) {
//      errorMessages.push("❌ 전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
//    }

    // 조건 2: 아직 섹션 5까지 안옴
    if (currentSectionIndex < sections.length - 1) {
    errorMessages.push("❌ 아직 홍보글에 필요한 모든 내용이 작성되지 않았습니다.");
    }

    // 조건 3: 마지막 섹션이지만 30단어 미만
    if (currentSectionIndex === sections.length - 1 && currentWordCount < 30) {
      errorMessages.push("❌ 단어 수가 부족합니다 (30단어 이상 작성해주세요).");
    }

    // 🔥 오류 메시지가 하나라도 있으면 제출 불가
    if (errorMessages.length > 0) {
      alert(`⚠️ 다음과 같은 이유로 제출이 실패되었습니다:\n\n${errorMessages.join("\n")}`);
      return;
    }

    try {
      // 현재 한국 시간(KST) 가져오기
      const koreaTime = new Date();
      // 한국 시간의 날짜와 시간을 문자열로 변환
      const formatter = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit"
      });

      const formattedKoreaTime = formatter.format(koreaTime);

      //firebase에 UID 포함하여 데이터에 저장
      await addDoc(collection(db, "korea-promotion-early-1"), {
//        phoneNumber: phoneNumber,
        panelId: panelId, // URL 파라미터에서 가져온 panel_id 저장
        wordCount: totalWordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        text: fullText.trim(), 
      });

      alert("✅ 작성하신 글이 성공적으로 제출되었습니다!");
//      setPhoneNumber(""); // 전화번호 초기화
      setCurrentInput("");
      setCurrentWordCount(0);
      setSectionTexts(["", "", "", "", ""]);
      setWarning([]); // ✨ 제출 성공 시 경고메시지 초기화


      // URL 파라미터에서 panel_id 가져오기
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("panel_id");

      // 🔁 마크로밀 엠브레인 설문으로 복귀 (아래 링크는 실제 조사 진행 시 변경되는 링크로 교체 예정)
      if (pid) {
        window.location.replace(`https://survey.panel.co.kr/2025/142289/m9.asp?panel_id=${encodeURIComponent(pid)}&status=001`);
      } else {
        alert("panel_id가 없습니다. 설문으로 돌아갈 수 없습니다.");
      }

    } catch (error) {
      console.error("🔥 데이터를 저장하는 데 문제가 발생했습니다:", error.message);
      alert(`🔥 데이터를 저장하는 데 문제가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          
      {/* 제목 및 안내 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "5px", fontSize: "18px" }}
        onCopy={(e) => {e.preventDefault();}}> 
        <h2>📝 'Visit Korea' 캠페인 홍보글 작성하기</h2>
        <p style = {{ fontSize: "18px", marginBottom: "-5px"}}> 'Visit Korea' 캠페인의 홍보 담당자가 되었다고 상상하면서, 다음과 같은 순서로 해외 방문객에게 대한민국을 알리는 홍보글을 한글로 작성해주세요.</p>
        <p style = {{ fontSize: "16px", marginTop: "10px", marginBottom: "-5px"}}> - 글을 작성하는 초반에 AI 글쓰기 파트너 'DraftMind'가 하단에 등장하여 여러분을 도와줄 것입니다. 'DraftMind'는 당신이 작성한 글을 읽고, 당신의 글을 개선하는 데 도움을 주는 조언을 제공합니다. 함께 홍보글을 완성해보세요.</p>
        <div style={{ lineHeight: "1.5"}}>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>1. 해외 방문객에 대한 인사말 (10단어 이상) </p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>2. 대한민국의 매력1 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>3. 대한민국의 매력2 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>4. 대한민국의 매력3 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "0px" }}>5. 대한민국의 매력4 (30단어 이상)</p>
        </div>
        <p style = {{ color: "darkred", fontSize: "16px", marginBottom: "-15px"}}> 각 파트를 단어수 제한에 맞게 작성한 후 '다음 순서로 넘어가기' 버튼을 누르면 다음 파트로 넘어갈 수 있습니다. 총 5개의 파트를 모두 마친 후 제출하기 버튼을 눌러주세요!</p>
        <p style = {{ padding: "0.5px"}}></p>
        <p style = {{ color: "red", fontSize: "16px", marginBottom: "-15px"}}> ⚠️ 주의: 글쓰기 과제에 대해 불성실한 참여(예: 주제와 전혀 관련없는 내용, 무의미한 단어 및 문장 반복, 영어로만 작성 등)가 확인될 경우, 설문을 완료했더라도 전체 보상 지급이 어려울 수 있습니다. </p>
        <p style = {{ color: "red", fontSize: "16px", marginBottom: "-15px"}}> ⚠️ 한번 다음 파트로 넘어가면 이전 파트로 돌아갈 수 없으니, 이점 유념하시어 성실한 참여 부탁드립니다. </p>
      </div>
  
      {/* 실시간 반영 홍보글 */}
      <div style={{
        width: "80%",
        marginLeft: "23px", 
        marginTop: "30px",
        marginBottom: "10px",
        padding: "15px",
        backgroundColor: "#f0f8ff",
        border: "1px solid #ddd",
        borderRadius: "5px",
        overflow: "visible", // 출력내용이 많아지면 자동으로 출력창 크기 조절
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "16px",
        }}>

        <strong>✏️ To. 방문객 여러분 </strong>
        <p>
          {currentSectionIndex < sectionTexts.length
            ? [...sectionTexts.slice(0, currentSectionIndex), currentInput]
            .filter(Boolean)
            .join("\n")
            : sectionTexts.join("\n")}
        </p>
      </div>

      
      {/* 텍스트 입력창 */}
      {currentSectionIndex < sections.length ? (
        <h3 className="section-title">
          {currentSectionIndex + 1}. {sections[currentSectionIndex]}
        </h3>
      ) : (
        <h3 className="section-title">
          ✉️ 홍보글 작성을 완료하셨습니다!
        </h3>
      )}

      {currentSectionIndex < sections.length && ( 
        <div style={{ width: "80%", textAlign: "left", fontSize: "18px" }}>
          <textarea
            style={{ width: "100%", height: "100px", padding: "10px", border: "1px solid #ccc", fontSize: "16px" }}
            value={isPreTextTyping ? preTextTyping : currentInput}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="여기에 글을 작성해주세요..."
            disabled={isInputDisabled}
            // ⛔ 붙여넣기/드래그/단축키 차단
            onPaste={preventPaste}
            onDrop={preventDrop}
            onDragOver={preventDrop}
            onKeyDown={preventKeyPaste}
            // (옵션) 우클릭 메뉴도 막고 싶다면 주석 해제
            onContextMenu={(e) => e.preventDefault()}
          />
          {showInputLockMessage && (
            <p style={{ color: "gray", fontWeight: "bold", fontSize: "14px", marginTop: "5px", marginBottom: "0px" }}>
              {hasTriggeredOnce && endingIndex >= endingText.length && hasInsertedExample
                ? "🪄 DraftMind의 입력이 완료되었습니다!"
                : "✨ DraftMind가 입력중입니다. 잠시만 기다려주세요..."}
            </p>
          )}
        </div>
      )}


      {/* ✅ 위쪽: 단어 수, 안내, 진행 바 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "80%",
        marginTop: "-5px"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <p style={{
            color: (currentSectionIndex === 0 ? currentWordCount >= 10 : currentWordCount >= 30) ? "green" : "black",
            fontWeight: (currentSectionIndex === 0 ? currentWordCount >= 10 : currentWordCount >= 30) ? "bold" : "normal",
            fontSize: "16px",
            margin: 0
          }}>
            {currentWordCount}/{currentSectionIndex === 0 ? 10 : 30} 단어
          </p>

          {((currentSectionIndex === 0 && currentWordCount >= 10) ||
            (currentSectionIndex > 0 && currentWordCount >= 30)) && (
            <p style={{
              color: "green",
              fontWeight: "bold",
              fontSize: "14px",
              marginLeft: "8px"
            }}>
              ✅ 필요한 단어수가 채워졌습니다.
            </p>
          )}
        </div>

        {/* 진행률 표시 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ marginBottom: "4px", color: "#888", fontSize: "16px" }}>
            {currentSectionIndex + 1} / {sections.length} 파트
          </span>
          <div style={{
            width: "120px",
            height: "6px",
            backgroundColor: "#eee",
            borderRadius: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${progressRatio * 100}%`,
              height: "100%",
              backgroundColor: "#4CAF50",
              transition: "width 0.4s ease"
            }} />
          </div>
        </div>
      </div>

      {/* ✅ 아래쪽: 버튼 또는 안내 메시지 + warning */}
      <div style={{ width: "80%", marginTop: "-5px" }}>
        {(
          ((currentSectionIndex === 0 && currentWordCount >= 10) ||
           (currentSectionIndex > 0 && currentWordCount >= 30)) && 
          warning.length === 0
        ) ? (
          currentSectionIndex < sections.length - 1 ? (
            <button
              onClick={handleNextSection}
              onMouseDown={() => setIsPressed(true)}
              onMouseUp={() => setIsPressed(false)}
              onMouseLeave={() => setIsPressed(false)}
              style={{
                padding: "4px 9px",
                backgroundColor: isPressed ? "#4CAF50" : "#45a049",
                color: "white",
                border: "1px solid #3e8e41",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                lineHeight: "1.2",
                height: "auto",
                maxHeight: "34px",
                visibility: shouldShowNextButton() ? "visible" : "hidden", // ← 버튼을 숨김
                cursor: shouldShowNextButton() ? "pointer" : "default",
              }}
            >
              다음 파트로 넘어가기
            </button>
          ) : (
            <p style={{
              color: "#007bff",
              fontWeight: "bold",
              fontSize: "16px",
              marginTop: "0px"
            }}>
              💡 홍보글에 필요한 내용이 모두 작성되었습니다! 아래 제출 버튼을 눌러주세요.
            </p>
          )
        ) : null}

        {warning.length > 0 && (
          <div style={{ color: "red", fontWeight: "bold", fontSize: "16px", marginTop: "0px" }}>
            {warning.map((msg, index) => (
              <p key={index} style={{ margin: "4px 0" }}>❌ {msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* AI DraftMind의 출력이 나타나는 영역 */}
      {currentSectionIndex === 1 && (
        <div 
          style={{ 
            width: "78.5%",
            marginLeft: "21px", 
            marginTop: "10px",
            padding: "20px",
            border: "1px solid #ccc",
            backgroundColor: "#f9f9f9",
            textAlign: "left",
            overflow: "visible", // 출력내용이 많아지면 자동으로 출력창 크기 조절
            wordBreak: "break-word", // 긴 단어가 출력창을 넘어가면 줄바꿈
            whiteSpace: "pre-wrap", // \n을 줄바꿈으로 인식
            display: "flex",
            flexDirection: "column", // 제목, 설명, 본문을 세로 정렬
            alignItems: "center",
          }}>

          {/* 제목 */}
          <h2 style={{ marginTop: "-10px", textAlign: "center", fontSize: "30px", marginBottom: "-10px" }}> 
          <em>AI DraftMind</em>🪶
          </h2>
       
          {/* 설명 */}
          <p style={{marginBottom: "20px", fontSize: "16px", textAlign: "center", color: "gray" }}>
            DraftMind 는 당신이 작성한 글을 읽고, 당신의 글을 개선하는 데 도움을 주는 조언을 제공합니다.
          </p>

          {/* 본문 및 이미지 컨테이너 (병렬 배치) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >

          {/* AI 아이콘 (왼쪽) */}
          <img
            src="/images/DraftMind_image.png"
            alt="AI Icon"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%", // 원형 이미지
              marginRight: "15px", // 이미지와 본문 사이 간격
              objectFit: "cover",
            }}
          />

          {/* 본문 (오른쪽) */}
          <div style={{ flex:1 }}>
            {hasTriggeredOnce && displayText.trim() !== "" && (
              <>
                {displayText
                  .replaceAll(", ", ",\u00A0") // 쉼표 뒤 공백을 불간섭 공백으로 대체하여 줄바꿈 방지
                  .split("\n")
                  .map((line, index) => (
                    <p key={index} style={{ fontWeight: "bold", fontSize: "16px", whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: "10px" }}>
                      {line}
                    </p>
                  ))}
              </>
            )}

              {/*예시 문장 선택창 표시*/}
              {showExampleContainer && (
                <div style={{ marginTop: "20px", backgroundColor: "#fff", padding: "15px", border: "1px dashed #aaa", borderRadius: "6px" }}
                  onCopy={(e) => {e.preventDefault();}}>
                  <p style={{ fontWeight: "bold" }}>당신의 글에 넣을 문장을 선택해주세요:</p>

                    <p>
                      {exampleTypingTexts[0]}
                    </p>

                  {showExampleChoice && (
                    <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <button
                          onClick={() => handleExampleChoice()}
                          style={{ padding: "8px 16px" }}
                        >
                          위 문장 선택
                        </button>
                    </div>
                  )}
                </div>
              )}      
            </div>
          </div>
        </div>
      )}


    {/* Submit 버튼 - 가장 아래로 배치 */}
    {currentSectionIndex === sections.length - 1 && currentWordCount >= 30 && (
      <button 
        onClick={() => {
          let errorMessages = []; 

          // 현재 입력 중인 섹션도 검사 (혹시 유저가 마지막 섹션까지 다 안 갔을 수도 있으므로)
          if (currentSectionIndex < sectionTexts.length - 1) {
            errorMessages.push("❌ 아직 홍보글에 필요한 모든 내용이 작성되지 않았습니다.");
          }

          if (currentSectionIndex === sections.length - 1 && currentWordCount < 30) {
            errorMessages.push("❌ 단어 수가 부족합니다 (각 파트를 30단어 이상 작성해주세요).");
          }

          if (errorMessages.length > 0) {
            alert(`⚠️ 홍보글을 제출할 수 없습니다:\n\n${errorMessages.join("\n")}`);
            return;
          }

          // 모든 조건 충족 시 미리보기 팝업 열기
          setShowPreview(true);
        }}

        style={{ 
          marginTop: "10px", padding: "12px 25px", backgroundColor: "#007bff", 
          color: "white", border: "none", cursor: "pointer", fontSize: "20px", fontWeight: "bold"
        }}>
        제출하기
      </button>
    )}

{showPreview && (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
    justifyContent: "center", alignItems: "center", zIndex: 9999
  }}>
    <div style={{
      backgroundColor: "#fff8dc", padding: "40px", borderRadius: "12px",
      width: "80%", maxHeight: "80%", overflowY: "auto", boxShadow: "0 0 15px rgba(0,0,0,0.3)",
      fontFamily: "serif"
    }}>
      <h2 style={{ marginBottom: "20px", fontWeight: "bold", fontSize: "20px" }}>📜 완성된 홍보글 미리보기</h2>

      <div style={{ whiteSpace: "pre-wrap", fontSize: "16px", lineHeight: 1.6, marginBottom: "30px" }}>
        {[...sectionTexts.slice(0, currentSectionIndex), currentInput].join("\n")}
      </div>

      {/* 전화번호 입력 / 최종 제출 버튼*/}
      <div style={{
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        gap: "12px", 
        marginBottom: "20px"
      }}>
      {/* 전화번호 입력칸 자리 */}

        <button
          onClick={() => {handleFinalSubmit()}}
          style={{
            padding: "12px 20px",
            marginBottom: "-5px",
            fontWeight: "bold",
            fontSize: "16px",
            borderRadius: "6px",
            backgroundColor: "#4a90e2",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          최종 제출하기
        </button>
      </div>

      {/* 전화번호 입력 메시지 자리 */}

      <span style={{ marginTop: "5px", fontSize: "15px", color: "gray", textAlign: "center", display: "block" }}>
        🔔제출버튼을 누르면 2~3초 후 제출이 완료되며, 자동으로 설문페이지로 넘어갑니다. 남은 설문을 완료해주세요.
      </span>

      <span style={{ marginTop: "5px", fontSize: "15px", color: "red", textAlign: "center", display: "block" }}>
        ⚠️ 주의: 글쓰기 과제에 대해 불성실한 참여가 확인될 경우, 설문을 완료했더라도 전체 보상 지급이 어려울 수 있습니다. 
      </span>

    </div>
  </div>
)}

  </div>
  );
}