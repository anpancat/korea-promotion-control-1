import { useState, useEffect } from "react";
import { db, collection, addDoc } from "./firebaseConfig"; // firebase 인증 모듈 불러오기

const getReturnURL = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("return") || "https://kupsychology.qualtrics.com/jfe/form/SV_50cgZp3hS4QPJUq";
};

export default function WritingTest() {
  const sections = [
    "식당 이름 & 음식 유형 (10단어 이상)",
    "다른 식당과의 차별점",
    "주요 고객층 및 홍보 전략",
    "추천 메뉴",
    "매장 위치 및 내부 설명"
  ];

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionTexts, setSectionTexts] = useState(["", "", "", "", ""]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [hasTriggeredOnce, setHasTriggeredOnce] = useState(false); // AI 애니메이션 조건 제어용

  const [displayText, setDisplayText] = useState("");
  const predefinedText = "저희 식당은 지역 농가와 직접 계약을 맺어 매일 신선한 식재료만을 사용합니다. 일반적인 프랜차이즈와 달리 모든 소스와 매장에서 직접 만들어 제공합니다. 정성과 진심이 담긴 수제 요리라는 점에서 다른 식당과 확연히 차별화됩니다."; // 미리 정해진 문장 삽입

  const [preTextIndex, setPreTextIndex] = useState(0);
  const [isPreTextTyping, setIsPreTextTyping] = useState(false); // 타이핑 중인 글자 저장
  const [preTextTyping, setPreTextTyping] = useState("");   // 타이핑 중인 글자

  const typingText = "...DraftMind가 입력중 입니다..."; //입력중
  const hello = "안녕하세요! 저는 글쓰기 전문 AI 'DraftMind'에요. \n지금 '식당 홍보글'을 쓰고 계시네요."; // 인사말
  const fullText = "홍보글 초반부를 작성하고 계시는군요. '다른 식당과의 차별점' 파트는 제가 도와드릴게요."; // AI 글쓰기 제안문구
  const endingText = "\n\n위와 같이 '다른 식당과의 차별점' 파트를 작성해보았어요. \n위의 초록색 '다음 파트로 넘어가기' 버튼을 눌러 홍보글을 이어서 작성해주세요.";
 // const examplePhrase = ["따스한 햇살이", "골목길을 비추고", "나뭇잎 사이로 부는 바람이", "잔잔한 소리를 냈다", "담벼락에는 고양이가 졸고 있었고", "창문 너머로", "김이 서린 찻잔이 보였다", "조용한 거리에", "어울리지 않게", "어디선가 작은 발소리가 들려오고", "고개를 들어", "소리가 난 곳을 찾아 두리번거리자", "멀리서 낯선 그림자를 발견했다"];  // 예시 구문들
 // const exampleKeywords = ["따스한", "햇살", "골목길", "비추고", "나뭇잎", "사이", "부는", "바람", "잔잔한", "소리", "냈다", "담벼락", "고양이", "졸고", "있었고", "창문", "너머", "김", "서린", "찻잔", "보였다", "조용한", "거리", "어울리지", "않게", "어디선가", "작은", "발소리", "들려오고", "고개", "들어", "소리", "난", "곳", "찾아", "두리번거리자", "멀리서", "낯선", "그림자", "발견했다"]; // 예시 단어들

  const [typingIndex, setTypingIndex] = useState(0);
  const [helloIndex, setHelloIndex] = useState(0);
  const [fullTextIndex, setFullTextIndex] = useState(0);
  const [isEndingTyping, setIsEndingTyping] = useState(false); // endingText 타이핑 시작 여부
  const [endingIndex, setEndingIndex] = useState(0); // endingText 타이핑 인덱스

  const [isTypingTextComplete, setIsTypingTextComplete] = useState(false);
  const [isHelloTyping, setIsHelloTyping] = useState(false);
  const [isFullTextTyping, setIsFullTextTyping] = useState(false);

  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [showInputLockMessage, setShowInputLockMessage] = useState(false);

  const [warning, setWarning] = useState("");

  const [isPressed, setIsPressed] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  // 참가자가 입력한 글 지우기 상태 추가
  const [isErasing, setIsErasing] = useState(false);
  const [eraseIndex, setEraseIndex] = useState(0);
  const [startErasing, setStartErasing] = useState(false);  // 지우기 잠시 대기
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);  // 다음 파트 버튼 비활성화용

  const isAiTypingInProgress = () => {
    return (
      hasTriggeredOnce &&
      (!isTypingTextComplete || isHelloTyping || isFullTextTyping || isPreTextTyping || isErasing || isEndingTyping || isWaitingBeforePreTyping)
    );
  };
  const [isWaitingBeforePreTyping, setIsWaitingBeforePreTyping] = useState(false);

  // 섹션 진행률 표시
  const progressRatio = (currentSectionIndex + 1) / sections.length;

  // 전화번호 입력 상태 추가
  const [phoneNumber, setPhoneNumber] = useState("");




  // 🔥 입력 잠금 메시지 상태 추가
  useEffect(() => {
    setShowInputLockMessage(isInputDisabled);
  }, [isInputDisabled]);

  const handleChange = (value) => {
    if (currentSectionIndex >= sectionTexts.length) return;

    setCurrentInput(value);
    const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
    setCurrentWordCount(wordCount);
  
    let warningMessages = []; // 여러 개의 경고 메시지를 저장할 배열
  
    // 🔥 단어 수 계산 (입력된 텍스트가 비어있으면 0으로 설정)
    let words = value.trim().length === 0 ? [] : value.trim().split(/\s+/);
  
    // ✅ 5단어 이상 입력된 경우에만 단어 반복 검사 실행
    if (words.length > 5) {
      // 🔥 같은 단어 반복 확인 및 하나만 입력 방지
      const wordCounts = {};
      words.forEach((word) => {
        word = word.replace(/[.,!?]/g, ""); // 🔥 문장부호 제거 후 단어 카운트
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
  
      // 🔥 중복 단어 비율 계산 (전체 단어의 30% 이상이 동일한 단어면 경고)
      const overusedWords = Object.entries(wordCounts)
        .filter(([_, count]) => count / words.length > 0.3)
        .map(([word]) => word);
  
      if (overusedWords.length > 0) {
        words = words.filter((word) => !overusedWords.includes(word));
        warningMessages.push(`동일 글자의 반복이 감지되었습니다: ${overusedWords.join(", ")}`);
      }} 
    
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
        
        // ✅ 이제 글 지우기를 시작하자
        setStartErasing(true);
      }, 1000);
    }
  }, [fullTextIndex, isFullTextTyping]);


  // 글 지우기 시작 효과
  useEffect(() => {
    if (startErasing && !isFullTextTyping && !isPreTextTyping && !isErasing) {
      setIsErasing(true);
      setEraseIndex(currentInput.length);
      setStartErasing(false);  // 딱 한 번만 실행
    }
  }, [startErasing, isFullTextTyping, isPreTextTyping, isErasing]);


  // 글 지우기 효과
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
        setIsPreTextTyping(true);
        setPreTextTyping("");
        setPreTextIndex(0);
      }, 300); // 1초 후에 타이핑 시작
    }

  }, [isErasing, eraseIndex]);


  // 미리 정해진 문장 타이핑효과
  useEffect(() => {
    //타이핑 효과 진행
    if (isPreTextTyping && preTextIndex < predefinedText.length) {
      const timer = setTimeout(() => {
        setPreTextTyping(predefinedText.slice(0, preTextIndex + 1));
        setPreTextIndex(preTextIndex + 1);
      }, 30);  // 타이핑 속도 조절
  
      return () => clearTimeout(timer);
    }
  
    if (isPreTextTyping && preTextIndex >= predefinedText.length) {
      setTimeout(() => {
        const finalText = predefinedText;
        setCurrentInput(finalText);
        setCurrentWordCount(finalText.trim().split(/\s+/).length);
        handleChange(finalText); // 경고 검사를 다시 실행

        setIsPreTextTyping(false);
        setIsWaitingBeforePreTyping(false);
        
        // ✅ 여기서 endingText 타이핑 시작
        setIsEndingTyping(true);
        setEndingIndex(0);  // 시작부터
      }, 800);
    }
  }, [isPreTextTyping, preTextIndex]);

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

      // ✅ 버튼 활성화만 해줌 (다음 파트 이동은 사용자가 직접 하게)
      setIsButtonDisabled(false);  // 다시 누를 수 있게
    }
  }, [isEndingTyping, endingIndex]);


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

    setHasTriggeredOnce(true);  // 🔥 이 줄 꼭 필요!
    setIsInputDisabled(true);  // ✅ 추가!
  };

  // AI 흐름 완료 후 다음 섹션으로 넘어가기
  const moveToNextSection = () => {
    const updated = [...sectionTexts];
    updated[currentSectionIndex] = currentInput;
    setSectionTexts(updated);

    setCurrentInput("");
    setCurrentWordCount(0);
    setCurrentSectionIndex(currentSectionIndex + 1);
    setIsInputDisabled(false);
    setIsButtonDisabled(false);
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
        setIsButtonDisabled(true);  // 🔥 여기서 버튼 잠시 숨김
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
    if (!phoneNumber.trim()) {
      errorMessages.push("❌ 전화번호를 입력해주세요.");
    }
    // 전화번호 형식 검사
    else if (!/^010-\d{4}-\d{4}$/.test(phoneNumber.trim())) {
      errorMessages.push("❌ 전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
    }

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
      //예시 구문 매칭 개수 계산
      // const matchedPhrase = examplePhrase.filter(phrase => fullText.trim().includes(phrase)); // 대소문자 구분없이 매칭

      //예시 단어 매칭 개수 계산
      // const textWords = fullText.trim().match(/[가-힣]+/g) || [];
      // const matchedWords = exampleKeywords.filter(keyword =>
        // textWords.some(word => word.includes(keyword))
      // );

      // const examplePhraseCount = matchedPhrase.length; // 예시구문 매칭 개수
      // const exampleWordCount = matchedWords.length; // 예시단어 매칭 개수


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
      await addDoc(collection(db, "promotion-early-1"), {
        phoneNumber: phoneNumber,
        text: fullText.trim(),
        wordCount: totalWordCount,
        timestamp: formattedKoreaTime,  // ✅ 한국 시간으로 변환한 값 저장
        // exampleWordCount: exampleWordCount, // 예시단어 매칭개수
        // exampleWords: matchedWords.join(", "), // 예시단어 매칭된 단어들
        // examplePhraseCount: examplePhraseCount, // 예시구문 매칭개수
        // examplePhrases: matchedPhrase.join(", ") // 예시구문 매칭된 구문들
      });

      alert("✅ 작성하신 글이 성공적으로 제출되었습니다!");
      setPhoneNumber(""); // 전화번호 초기화
      setCurrentInput("");
      setCurrentWordCount(0);
      setSectionTexts(["", "", "", "", ""]);
      setWarning(""); // ✨ 제출 성공 시 경고메시지 초기화

      console.log("🔁 Returning to:", getReturnURL());
      // 🎯 퀄트릭스로 다시 이동
      window.location.href = getReturnURL();

    } catch (error) {
      console.error("🔥 데이터를 저장하는 데 문제가 발생했습니다:", error.message);
      alert(`🔥 데이터를 저장하는 데 문제가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          
      {/* 제목 및 안내 */}
      <div style={{ width: "80%", textAlign: "left", marginBottom: "5px", fontSize: "18px" }}> 
        <h2>📝 식당 홍보글 작성하기</h2>
        <p style = {{ fontSize: "18px", marginBottom: "-5px"}}> 가상의 식당의 대표가 되었다고 상상하면서, 다음과 같은 순서로 식당의 홍보글을 작성해주세요.</p>
        <div style={{ lineHeight: "1.5"}}>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>1. 식당 이름 & 음식 유형 (10단어 이상) </p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>2. 다른 식당과의 차별점 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>3. 주요 고객층 및 홍보 전략 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "-15px" }}>4. 추천 메뉴 (30단어 이상)</p>
          <p style={{ color: "dimgray", fontSize: "16px", marginBottom: "0px" }}>5. 매장 위치 및 내부 설명 (30단어 이상)</p>
        </div>
        <p style = {{ color: "darkred", fontSize: "16px", marginBottom: "-15px"}}> 각 파트를 단어수 제한에 맞게 작성한 후 '다음 순서로 넘어가기' 버튼을 누르면 다음 파트로 넘어갈 수 있습니다. 총 5개의 파트를 모두 마친 후 제출하기 버튼을 눌러주세요!</p>
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

        <strong>✏️ To. 고객 여러분 </strong>
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
          />
          {showInputLockMessage && (
            <p style={{ color: "gray", fontWeight: "bold", fontSize: "14px", marginTop: "5px", marginBottom: "0px" }}>
               {isAiTypingInProgress()
              ? "✨ DraftMind가 입력중입니다. 잠시만 기다려주세요..."
              : "🪄 DraftMind의 입력이 완료되었습니다!"}
            </p>
          )}
        </div>
      )}


      {/* ✅ 1줄 위: 단어 수 + 안내 메시지 + 진행바 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "80%",
        marginTop: "-5px",
      }}>

        {/* 왼쪽: 단어 수 + 안내 */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <p style={{
            color: (currentSectionIndex === 0 
              ? (currentWordCount >= 10)
              : currentWordCount >= 30) ? "green" : "black",
            fontWeight: (currentSectionIndex === 0 
              ? (currentWordCount >= 10)
              : currentWordCount >= 30) ? "bold" : "normal",
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

        {/* 오른쪽: 진행 바 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ marginBottom: "4px", color: "#888", fontSize: "16px" }}>
            {currentSectionIndex + 1} / {sections.length} 파트
          </span>
          <div style={{
            width: "120px",
            height: "6px",
            backgroundColor: "#eee",
            borderRadius: "4px",
            overflow: "hidden",
            marginRight: "-20px"
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

      {/* ✅ 2줄 아래: 버튼 또는 메시지 + warning */}
      <div style={{ width: "80%", marginTop: "-5px" }}>
        {((currentSectionIndex === 0 && currentWordCount >= 10) || 
          (currentSectionIndex > 0 && currentWordCount >= 30)) && warning.length === 0 && // ✅ 경고 메시지가 없을 때만!
          (currentSectionIndex < sections.length - 1 ? (
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
                cursor: isButtonDisabled ? "default" : "pointer",
                visibility: isButtonDisabled ? "hidden" : "visible",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                lineHeight: "1.2",
                height: "auto",
                maxHeight: "34px"
              }}
              disabled={isButtonDisabled}
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
              💡홍보글에 필요한 내용이 모두 작성되었습니다! 아래 제출 버튼을 눌러주세요.
            </p>
          )
        )}

        {/* warning 메시지 */}
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
        <div>
          <label htmlFor="phoneInput" style={{ fontWeight: "bold", marginRight: "8px" }}>
            📱 전화번호:
          </label>
          <input
            id="phoneInput"
            type="text"
            inputMode="text" // ← 모바일 키보드는 숫자 기반
            pattern="[0-9\-]*"   // ← 숫자와 하이픈만 허용
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="010-1234-5678"
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "180px"
            }}
          />
        </div>

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

      <span style={{ marginTop: "10px", fontSize: "15px", color: "gray", textAlign: "center", display: "block" }}>
        ✅참여 확인을 위해 전화번호를 반드시 입력해주세요.
      </span>

      <span style={{ marginTop: "5px", fontSize: "15px", color: "gray", textAlign: "center", display: "block" }}>
        🔔제출버튼을 누르면 2~3초 후 제출이 완료되며, 자동으로 설문페이지로 넘어갑니다. 남은 설문을 완료해주세요.
      </span>

    </div>
  </div>
)}

  </div>
  );
}