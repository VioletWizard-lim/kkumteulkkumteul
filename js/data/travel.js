// 여행 영어 회화
// 각 상황: 대화문(dialogue)과 꼭 필요한 표현(phrases)
// speaker: "me" = 나, "other" = 상대방
window.TRAVEL_TOPICS = [
  {
    id: "airport",
    title: "공항 · 출입국",
    emoji: "✈️",
    dialogue: [
      ["other", "Good morning. May I see your passport, please?", "안녕하세요. 여권을 보여 주시겠어요?"],
      ["me", "Sure, here you are.", "네, 여기 있습니다."],
      ["other", "What's the purpose of your visit?", "방문 목적이 무엇인가요?"],
      ["me", "I'm here to visit schools and learn about Finnish education.", "학교를 방문하고 핀란드 교육에 대해 배우러 왔어요."],
      ["other", "How long will you be staying?", "얼마나 머무르실 건가요?"],
      ["me", "For two weeks.", "2주 동안이요."],
      ["other", "Where will you be staying?", "어디에 머무르시나요?"],
      ["me", "At a hotel in Helsinki.", "헬싱키에 있는 호텔에서요."],
      ["other", "Okay. Enjoy your stay in Finland.", "알겠습니다. 핀란드에서 즐거운 시간 보내세요."],
      ["me", "Thank you very much.", "정말 감사합니다."]
    ],
    phrases: [
      ["Where is the baggage claim?", "수하물 찾는 곳이 어디예요?"],
      ["My luggage didn't arrive.", "제 짐이 도착하지 않았어요."],
      ["I'd like a window seat, please.", "창가 좌석으로 주세요."],
      ["Which gate is it?", "몇 번 게이트인가요?"],
      ["Is this flight on time?", "이 비행기 제시간에 출발하나요?"],
      ["I have nothing to declare.", "신고할 물건이 없습니다."]
    ]
  },
  {
    id: "hotel",
    title: "호텔 · 숙소",
    emoji: "🏨",
    dialogue: [
      ["me", "Hi, I have a reservation under the name Kim.", "안녕하세요, 김이라는 이름으로 예약했어요."],
      ["other", "Welcome! Let me check. Yes, a double room for five nights.", "환영합니다! 확인해 볼게요. 네, 더블룸 5박이네요."],
      ["me", "That's right. What time is breakfast?", "맞아요. 아침 식사는 몇 시인가요?"],
      ["other", "Breakfast is served from seven to ten on the second floor.", "아침은 7시부터 10시까지 2층에서 제공됩니다."],
      ["me", "Great. Is there free Wi-Fi?", "좋네요. 무료 와이파이가 있나요?"],
      ["other", "Yes, the password is on your key card holder.", "네, 비밀번호는 카드키 케이스에 적혀 있어요."],
      ["me", "And what time is check-out?", "체크아웃은 몇 시인가요?"],
      ["other", "Check-out is at noon. Here's your key. Room 405.", "체크아웃은 정오입니다. 열쇠 여기 있어요. 405호입니다."],
      ["me", "Thank you!", "감사합니다!"]
    ],
    phrases: [
      ["Could I check in early?", "일찍 체크인할 수 있을까요?"],
      ["Can you keep my luggage?", "짐을 맡아 주실 수 있나요?"],
      ["The heater isn't working.", "난방기가 작동하지 않아요."],
      ["Could I have an extra towel?", "수건을 하나 더 받을 수 있을까요?"],
      ["Is there a sauna in the hotel?", "호텔에 사우나가 있나요?"],
      ["Could you call a taxi for me?", "택시를 불러 주실 수 있나요?"]
    ]
  },
  {
    id: "restaurant",
    title: "식당 · 카페",
    emoji: "🍲",
    dialogue: [
      ["other", "Hi! A table for how many?", "안녕하세요! 몇 분이세요?"],
      ["me", "A table for two, please.", "두 명이요."],
      ["other", "Here's the menu. Can I get you something to drink?", "메뉴판입니다. 음료 먼저 드릴까요?"],
      ["me", "Two glasses of water, please. What do you recommend?", "물 두 잔 주세요. 추천해 주실 메뉴가 있나요?"],
      ["other", "Our salmon soup is very popular. It's a Finnish classic.", "연어 수프가 인기 많아요. 핀란드 대표 요리예요."],
      ["me", "Sounds good. I'll have the salmon soup.", "좋아요. 연어 수프로 할게요."],
      ["other", "Anything else?", "다른 건 필요 없으세요?"],
      ["me", "That's all for now, thank you.", "지금은 그거면 돼요, 감사합니다."],
      ["me", "Excuse me, could we have the bill, please?", "실례합니다, 계산서 좀 주시겠어요?"],
      ["other", "Of course. Would you like to pay by card?", "물론이죠. 카드로 계산하시겠어요?"]
    ],
    phrases: [
      ["Do you have an English menu?", "영어 메뉴판 있나요?"],
      ["I'm allergic to nuts.", "견과류 알레르기가 있어요."],
      ["Can I get this to go?", "포장해 갈 수 있나요?"],
      ["Could I have some more bread?", "빵을 좀 더 주실 수 있나요?"],
      ["It was delicious, thank you.", "정말 맛있었어요, 감사합니다."],
      ["A cinnamon bun and a coffee, please.", "시나몬 번 하나랑 커피 한 잔 주세요."]
    ]
  },
  {
    id: "transport",
    title: "교통 · 길 찾기",
    emoji: "🚋",
    dialogue: [
      ["me", "Excuse me, how can I get to the Central Railway Station?", "실례합니다, 중앙역에 어떻게 가나요?"],
      ["other", "You can take tram number 4. The stop is just over there.", "4번 트램을 타시면 돼요. 정류장은 바로 저기예요."],
      ["me", "Where can I buy a ticket?", "표는 어디서 사나요?"],
      ["other", "You can buy one with the HSL app or at the ticket machine.", "HSL 앱이나 매표기에서 살 수 있어요."],
      ["me", "How long does it take?", "얼마나 걸리나요?"],
      ["other", "About ten minutes.", "10분 정도요."],
      ["me", "Thank you so much for your help.", "도와주셔서 정말 감사합니다."],
      ["other", "No problem. Have a nice day!", "천만에요. 좋은 하루 보내세요!"]
    ],
    phrases: [
      ["Does this bus go to the city center?", "이 버스 시내로 가나요?"],
      ["Which stop should I get off at?", "어느 정류장에서 내려야 하나요?"],
      ["Is it within walking distance?", "걸어갈 수 있는 거리인가요?"],
      ["Could you show me on the map?", "지도에서 보여 주실 수 있나요?"],
      ["I'm lost.", "길을 잃었어요."],
      ["A one-way ticket to Turku, please.", "투르쿠행 편도 표 한 장 주세요."]
    ]
  },
  {
    id: "shopping",
    title: "쇼핑",
    emoji: "🛍️",
    dialogue: [
      ["other", "Hi, can I help you?", "안녕하세요, 도와드릴까요?"],
      ["me", "I'm just looking, thanks.", "그냥 둘러보는 중이에요, 감사합니다."],
      ["me", "Actually, do you have this sweater in a medium?", "사실, 이 스웨터 미디엄 사이즈 있나요?"],
      ["other", "Let me check. Yes, here you go.", "확인해 볼게요. 네, 여기 있어요."],
      ["me", "Can I try it on?", "입어 봐도 될까요?"],
      ["other", "Sure, the fitting room is over there.", "그럼요, 탈의실은 저쪽이에요."],
      ["me", "It fits well. How much is it?", "잘 맞네요. 얼마예요?"],
      ["other", "It's 49 euros.", "49유로입니다."],
      ["me", "I'll take it. Can I get a tax-free form?", "이걸로 할게요. 택스 프리 서류 받을 수 있나요?"],
      ["other", "Of course. Please show me your passport.", "물론이죠. 여권 보여 주세요."]
    ],
    phrases: [
      ["Do you have a smaller size?", "더 작은 사이즈 있나요?"],
      ["Is this on sale?", "이거 세일 중인가요?"],
      ["Can I pay by card?", "카드로 계산할 수 있나요?"],
      ["Could you gift-wrap it?", "선물 포장해 주실 수 있나요?"],
      ["I'd like to return this.", "이거 반품하고 싶어요."],
      ["Do I need a bag? – No, thanks.", "봉투 필요하세요? – 아니요, 괜찮아요."]
    ]
  },
  {
    id: "school",
    title: "학교 방문",
    emoji: "🏫",
    dialogue: [
      ["other", "Welcome to our school! I'm Liisa, one of the teachers here.", "저희 학교에 오신 걸 환영해요! 저는 이곳 교사 리사예요."],
      ["me", "Nice to meet you, Liisa. Thank you for having us.", "만나서 반가워요, 리사. 초대해 주셔서 감사합니다."],
      ["other", "Would you like to see a classroom first?", "먼저 교실을 보시겠어요?"],
      ["me", "Yes, please. How many students are in a class?", "네, 좋아요. 한 반에 학생이 몇 명인가요?"],
      ["other", "Usually about twenty.", "보통 20명 정도예요."],
      ["me", "May I take some photos of the classroom?", "교실 사진을 좀 찍어도 될까요?"],
      ["other", "Sure, but please don't take photos of the children.", "그럼요, 하지만 아이들 사진은 찍지 말아 주세요."],
      ["me", "Of course. How long is the break between lessons?", "물론이죠. 수업 사이 쉬는 시간은 얼마나 되나요?"],
      ["other", "Fifteen minutes. The children go outside in every weather.", "15분이에요. 아이들은 날씨와 상관없이 밖에 나가요."],
      ["me", "That's wonderful. I'd love to learn more about that.", "멋지네요. 그것에 대해 더 배우고 싶어요."]
    ],
    phrases: [
      ["Could you tell me more about the curriculum?", "교육과정에 대해 더 말씀해 주실 수 있나요?"],
      ["How do you assess students?", "학생들을 어떻게 평가하세요?"],
      ["How do you support students who need help?", "도움이 필요한 학생은 어떻게 지원하나요?"],
      ["Can I observe the lesson?", "수업을 참관해도 될까요?"],
      ["What do teachers do during recess?", "쉬는 시간에 선생님들은 무엇을 하나요?"],
      ["Thank you for sharing your experience.", "경험을 나눠 주셔서 감사합니다."]
    ]
  },
  {
    id: "smalltalk",
    title: "스몰토크 · 친구 사귀기",
    emoji: "☕",
    dialogue: [
      ["other", "Hi! Are you new here?", "안녕하세요! 여기 처음이세요?"],
      ["me", "Yes, I just arrived from Korea last week.", "네, 지난주에 한국에서 막 왔어요."],
      ["other", "Oh, welcome! How do you like Finland so far?", "오, 환영해요! 지금까지 핀란드는 어때요?"],
      ["me", "I love it. Everything is so calm and clean.", "정말 좋아요. 모든 게 아주 차분하고 깨끗해요."],
      ["other", "Have you tried a Finnish sauna yet?", "핀란드 사우나는 해 보셨어요?"],
      ["me", "Not yet, but I really want to!", "아직이요, 그런데 정말 해 보고 싶어요!"],
      ["other", "You should! What do you do in Korea?", "꼭 해 보세요! 한국에서는 무슨 일을 하세요?"],
      ["me", "I'm a teacher. I'm interested in Finnish education.", "저는 교사예요. 핀란드 교육에 관심이 많아요."],
      ["other", "That's interesting! Let's grab a coffee sometime.", "흥미롭네요! 언제 커피 한잔해요."],
      ["me", "I'd love to. Here's my number.", "좋아요. 제 번호예요."]
    ],
    phrases: [
      ["Where are you from?", "어디에서 오셨어요?"],
      ["What do you do for fun?", "취미로 뭘 하세요?"],
      ["Have you ever been to Korea?", "한국에 가 본 적 있으세요?"],
      ["What's a must-see place here?", "여기서 꼭 가 봐야 할 곳이 어디예요?"],
      ["It was nice talking to you.", "얘기 나눠서 즐거웠어요."],
      ["Let's keep in touch!", "연락하고 지내요!"]
    ]
  },
  {
    id: "emergency",
    title: "응급 · 도움 요청",
    emoji: "🚑",
    dialogue: [
      ["me", "Excuse me, could you help me? I don't feel well.", "실례합니다, 도와주실 수 있나요? 몸이 안 좋아요."],
      ["other", "Oh no. What's wrong?", "저런. 어디가 안 좋으세요?"],
      ["me", "I have a bad headache and a fever.", "두통이 심하고 열이 나요."],
      ["other", "There's a pharmacy around the corner. Do you need a doctor?", "모퉁이에 약국이 있어요. 의사가 필요하세요?"],
      ["me", "I think I just need some medicine.", "약만 있으면 될 것 같아요."],
      ["other", "Okay. If it gets worse, call 112.", "알겠어요. 더 심해지면 112에 전화하세요."],
      ["me", "Thank you so much. You're very kind.", "정말 감사합니다. 정말 친절하시네요."]
    ],
    phrases: [
      ["Please call an ambulance.", "구급차를 불러 주세요."],
      ["I lost my passport.", "여권을 잃어버렸어요."],
      ["My wallet was stolen.", "지갑을 도난당했어요."],
      ["Where is the nearest hospital?", "가장 가까운 병원이 어디예요?"],
      ["I need help.", "도움이 필요해요."],
      ["Can I use your phone?", "전화 좀 써도 될까요?"]
    ]
  }
];
