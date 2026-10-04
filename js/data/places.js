// 핀란드 · 체코 추천 관광지
// 운영 시간과 요금은 계절마다 바뀌니 방문 전에 공식 홈페이지에서 확인하세요.
// phrase: 그곳에서 써먹을 수 있는 영어 한마디 [영어, 한국어]
window.PLACE_COUNTRIES = [
  {
    id: "finland",
    name: "핀란드",
    flag: "🇫🇮",
    info: [
      ["💶 통화", "유로(EUR)"],
      ["🕐 시차", "한국보다 7시간 느림 (겨울 기준)"],
      ["🗣️ 언어", "핀란드어·스웨덴어, 영어가 잘 통해요"],
      ["💳 결제", "카드·모바일 결제가 거의 어디서나 돼요"],
      ["🍽️ 팁", "필요 없어요"],
      ["🔌 전압", "230V, C/F 타입 (한국 플러그 그대로 사용)"],
      ["🚨 긴급 전화", "112"],
      ["🙏 현지어", "Kiitos(키토스) = 고마워요 · Moi(모이) = 안녕"]
    ],
    regions: [
      {
        name: "헬싱키",
        places: [
          {
            id: "suomenlinna",
            name: "Suomenlinna",
            ko: "수오멘린나 요새",
            tags: ["유네스코", "섬", "산책"],
            desc: "헬싱키 앞바다 섬 위에 지어진 18세기 바다 요새예요. 마켓 광장에서 대중교통 페리로 15분이면 도착하고, 성벽과 대포, 작은 박물관을 둘러보며 걷기 좋아요.",
            winter: "겨울에도 페리가 다니지만 바닷바람이 매섭게 차요. 방한화와 모자는 꼭 챙기세요.",
            phrase: ["Is this the ferry to Suomenlinna?", "이게 수오멘린나 가는 페리인가요?"]
          },
          {
            id: "oodi",
            name: "Oodi Helsinki Central Library",
            ko: "오디 중앙도서관",
            tags: ["교육", "건축", "무료"],
            desc: "'도시의 거실'이라 불리는 헬싱키 중앙도서관이에요. 3D 프린터, 재봉틀, 녹음실까지 있어 선생님들께 꼭 추천하는 곳이에요. 3층 열람실의 통유리 창과 테라스 전망이 멋져요.",
            winter: "추운 날 몸을 녹이며 쉬어 가기 좋아요. 입장은 무료예요.",
            phrase: ["Can visitors use the 3D printers here?", "방문객도 여기 3D 프린터를 쓸 수 있나요?"]
          },
          {
            id: "cathedral",
            name: "Helsinki Cathedral & Senate Square",
            ko: "헬싱키 대성당과 원로원 광장",
            tags: ["랜드마크", "사진"],
            desc: "하얀 벽과 초록 돔이 인상적인 헬싱키의 상징이에요. 계단에 앉아 원로원 광장을 내려다보는 풍경이 유명해요.",
            winter: "눈 덮인 광장과 조명이 켜진 저녁 풍경이 특히 아름다워요.",
            phrase: ["Could you take a photo of us with the cathedral?", "대성당이 나오게 사진 좀 찍어 주실래요?"]
          },
          {
            id: "temppeliaukio",
            name: "Temppeliaukio Church",
            ko: "암석 교회",
            tags: ["건축", "음악"],
            desc: "바위를 파내서 지은 독특한 교회예요. 구리 돔 천장 아래로 자연광이 들어오고, 음향이 좋아 음악회도 자주 열려요.",
            winter: "실내라 날씨와 상관없이 방문하기 좋아요. 예배나 행사 시간에는 관람이 제한될 수 있어요.",
            phrase: ["Is there a concert here this week?", "이번 주에 여기서 음악회가 있나요?"]
          },
          {
            id: "market-square",
            name: "Market Square & Old Market Hall",
            ko: "마켓 광장과 올드 마켓 홀",
            tags: ["음식", "시장"],
            desc: "항구 옆 야외 시장과 100년 넘은 실내 시장이에요. 연어 수프, 시나몬 번, 순록 요리 같은 핀란드 음식을 맛보기 좋아요.",
            winter: "겨울엔 야외 노점이 줄어드니 따뜻한 실내 시장인 올드 마켓 홀을 추천해요.",
            phrase: ["Can I try the salmon soup, please?", "연어 수프 하나 주시겠어요?"]
          },
          {
            id: "loyly",
            name: "Löyly",
            ko: "뢰윌뤼 퍼블릭 사우나",
            tags: ["사우나", "체험"],
            desc: "바닷가에 있는 세련된 공공 사우나예요. 사우나 후 바다에 뛰어드는 핀란드식 체험을 해 볼 수 있어요. 수영복을 입고 이용해요.",
            winter: "겨울 바다 입수는 정말 짜릿해요! 인기가 많으니 미리 예약하세요.",
            phrase: ["Do I need to book in advance?", "미리 예약해야 하나요?"]
          },
          {
            id: "design-district",
            name: "Design District & Ateneum",
            ko: "디자인 디스트릭트와 아테네움 미술관",
            tags: ["디자인", "미술관", "쇼핑"],
            desc: "핀란드 디자인 숍과 갤러리가 모인 거리예요. 근처 아테네움 미술관에서는 핀란드 국민 화가들의 작품을 볼 수 있어요.",
            winter: "실내 위주라 추운 날 일정으로 좋아요. 미술관은 월요일 휴관이 많아요.",
            phrase: ["Is this designed in Finland?", "이거 핀란드에서 디자인한 건가요?"]
          }
        ]
      },
      {
        name: "헬싱키 근교",
        places: [
          {
            id: "porvoo",
            name: "Porvoo",
            ko: "포르보 구시가지",
            tags: ["당일치기", "구시가지", "카페"],
            desc: "헬싱키에서 버스로 약 1시간 거리의 오래된 마을이에요. 강가의 붉은 목조 창고와 알록달록한 골목, 아기자기한 카페가 그림 같아요.",
            winter: "눈 내린 목조 마을이 동화처럼 예뻐요. 해가 일찍 지니 오전에 출발하세요.",
            phrase: ["Which bus goes to Porvoo?", "포르보 가는 버스가 어느 거예요?"]
          },
          {
            id: "nuuksio",
            name: "Nuuksio National Park",
            ko: "누크시오 국립공원",
            tags: ["자연", "숲", "트레킹"],
            desc: "헬싱키 근교에서 가장 가까운 국립공원이에요. 호수와 숲 사이로 표시가 잘 된 산책로가 있어 핀란드의 숲을 쉽게 느낄 수 있어요.",
            winter: "눈길이 미끄러우니 아이젠이나 미끄럼 방지 신발이 좋아요. 짧은 코스를 고르세요.",
            phrase: ["Which trail is best for beginners?", "초보자에게 가장 좋은 산책로는 어디예요?"]
          }
        ]
      },
      {
        name: "남서부 · 호수 지방",
        places: [
          {
            id: "turku",
            name: "Turku Castle & Cathedral",
            ko: "투르쿠 성과 대성당",
            tags: ["역사", "옛 수도"],
            desc: "핀란드의 옛 수도 투르쿠에는 700년 넘은 성과 대성당이 있어요. 아우라 강변을 따라 산책하기 좋고, 헬싱키에서 기차로 2시간 정도예요.",
            winter: "강변 산책 후 성 안 박물관에서 몸을 녹이세요.",
            phrase: ["How long does it take to get to Turku by train?", "투르쿠까지 기차로 얼마나 걸려요?"]
          },
          {
            id: "tampere",
            name: "Tampere",
            ko: "탐페레 (무민 박물관·퓌니키 전망대)",
            tags: ["무민", "도시", "사우나 수도"],
            desc: "두 호수 사이의 도시로 '사우나의 수도'라 불려요. 무민 원화를 볼 수 있는 무민 박물관과, 도넛이 유명한 퓌니키 전망대 카페를 추천해요.",
            winter: "얼어붙은 호수 풍경을 보며 공공 사우나를 즐겨 보세요.",
            phrase: ["One coffee and a doughnut, please.", "커피 한 잔이랑 도넛 하나 주세요."]
          },
          {
            id: "saimaa",
            name: "Savonlinna & Lake Saimaa",
            ko: "사본린나와 사이마 호수",
            tags: ["호수", "성"],
            desc: "핀란드에서 가장 큰 호수 지방이에요. 호수 위 섬에 세워진 올라빈린나 성이 유명해요.",
            winter: "겨울엔 운영 시간이 짧아질 수 있어요. 방문 전 꼭 확인하세요.",
            phrase: ["Is the castle open today?", "오늘 성이 문을 여나요?"]
          }
        ]
      },
      {
        name: "라플란드",
        places: [
          {
            id: "rovaniemi",
            name: "Rovaniemi & Santa Claus Village",
            ko: "로바니에미 산타클로스 마을",
            tags: ["북극권", "산타", "겨울 필수"],
            desc: "북극권 경계선에 있는 산타클로스 마을이에요. 산타를 만나고, 산타 우체국에서 엽서를 보내고, 순록·허스키 썰매를 탈 수 있어요. 북극 문화를 소개하는 아르크티쿰 과학관도 좋아요.",
            winter: "1월은 영하 20도 아래로 내려가기도 해요. 방한복을 빌려주는 투어도 많아요.",
            phrase: ["Can I send a postcard from Santa's post office?", "산타 우체국에서 엽서를 보낼 수 있나요?"]
          },
          {
            id: "aurora",
            name: "Northern Lights in Lapland",
            ko: "라플란드 오로라 관측",
            tags: ["오로라", "밤", "버킷리스트"],
            desc: "맑고 어두운 밤이면 오로라를 볼 수 있어요. 도시 불빛을 피해 나가는 오로라 투어나, 유리 이글루 숙소가 인기예요.",
            winter: "오로라 예보 앱과 구름 예보를 함께 확인하세요. 기다리는 동안 정말 추워요!",
            phrase: ["What's the aurora forecast for tonight?", "오늘 밤 오로라 예보는 어때요?"]
          },
          {
            id: "levi",
            name: "Levi & Saariselkä",
            ko: "레비 · 사리셀카",
            tags: ["스키", "허스키"],
            desc: "라플란드의 대표 스키 리조트 마을이에요. 스키, 스노모빌, 허스키 썰매, 크로스컨트리 스키를 모두 즐길 수 있어요.",
            winter: "한겨울엔 낮이 아주 짧아요. 활동은 밝은 한낮에 몰아서 하세요.",
            phrase: ["Can I rent cross-country skis here?", "여기서 크로스컨트리 스키를 빌릴 수 있나요?"]
          }
        ]
      }
    ]
  },
  {
    id: "czech",
    name: "체코",
    flag: "🇨🇿",
    info: [
      ["💰 통화", "코루나(CZK) · 유로가 아니에요!"],
      ["🕐 시차", "한국보다 8시간 느림 (겨울 기준)"],
      ["🗣️ 언어", "체코어, 관광지에서는 영어가 통해요"],
      ["💳 결제", "카드 결제가 잘 돼요. 유로로 내면 환율이 불리해요"],
      ["🍽️ 팁", "식당에서는 10% 정도가 일반적이에요"],
      ["🔌 전압", "230V, C/E 타입 (한국 플러그 대부분 사용 가능)"],
      ["🚨 긴급 전화", "112"],
      ["🙏 현지어", "Děkuji(데쿠이) = 고마워요 · Dobrý den(도브리 덴) = 안녕하세요"]
    ],
    regions: [
      {
        name: "프라하",
        places: [
          {
            id: "charles-bridge",
            name: "Charles Bridge",
            ko: "카를교",
            tags: ["랜드마크", "야경"],
            desc: "블타바 강을 가로지르는 14세기 돌다리예요. 다리 양옆의 성인 조각상과 프라하 성 전망이 아름다워요.",
            winter: "이른 아침에 가면 사람이 적고 안개 낀 풍경이 신비로워요.",
            phrase: ["What time is it least crowded?", "언제 가장 덜 붐벼요?"]
          },
          {
            id: "prague-castle",
            name: "Prague Castle",
            ko: "프라하 성과 성 비투스 대성당",
            tags: ["유네스코", "역사"],
            desc: "세계에서 가장 큰 고성 단지 중 하나예요. 성 비투스 대성당의 스테인드글라스와 '황금 소로'의 작은 집들이 유명해요.",
            winter: "언덕길이 미끄러울 수 있어요. 트램을 타고 위에서부터 내려오면 편해요.",
            phrase: ["Which ticket includes the cathedral?", "어떤 표에 대성당이 포함돼 있나요?"]
          },
          {
            id: "old-town",
            name: "Old Town Square & Astronomical Clock",
            ko: "구시가 광장과 천문시계",
            tags: ["광장", "시계탑"],
            desc: "프라하의 중심 광장이에요. 매시 정각 인형이 움직이는 600년 된 천문시계와 틴 성당이 있어요. 시계탑 전망대에서 광장을 내려다볼 수 있어요.",
            winter: "1월 초까지 크리스마스 마켓이 열리는 해가 많아요. 일정은 미리 확인하세요.",
            phrase: ["When does the clock show start?", "시계 인형극은 언제 시작해요?"]
          },
          {
            id: "josefov",
            name: "Josefov (Jewish Quarter)",
            ko: "요제포프 유대인 지구",
            tags: ["역사", "박물관"],
            desc: "오래된 시나고그와 묘지가 남아 있는 유대인 지구예요. 역사 교육 자료로도 의미가 깊은 곳이에요.",
            winter: "시나고그는 토요일과 유대교 명절에 쉬어요.",
            phrase: ["Is there an audio guide in Korean?", "한국어 오디오 가이드가 있나요?"]
          },
          {
            id: "petrin",
            name: "Petřín Hill & Lookout Tower",
            ko: "페트르진 언덕 전망대",
            tags: ["전망", "공원"],
            desc: "에펠탑을 닮은 작은 전망대가 있는 언덕이에요. 꼭대기에서 프라하의 빨간 지붕들을 한눈에 볼 수 있어요.",
            winter: "푸니쿨라(산악 열차) 운행 여부를 확인하고, 운행하지 않으면 걸어서 올라가요.",
            phrase: ["Is the funicular running today?", "오늘 푸니쿨라 운행하나요?"]
          },
          {
            id: "vysehrad",
            name: "Vyšehrad",
            ko: "비셰흐라드",
            tags: ["현지인 추천", "산책"],
            desc: "관광객이 적은 언덕 위 옛 성터예요. 스메타나와 드보르자크가 잠든 묘지와 강변 전망이 좋아요.",
            winter: "조용히 산책하며 프라하 풍경을 즐기기 좋아요.",
            phrase: ["Is this where Dvořák is buried?", "여기가 드보르자크가 잠든 곳인가요?"]
          },
          {
            id: "lennon-wall",
            name: "Lennon Wall & Kampa Island",
            ko: "존 레논 벽과 캄파 섬",
            tags: ["사진", "산책"],
            desc: "평화의 메시지가 가득한 낙서 벽과, 바로 옆 강가의 조용한 캄파 섬이에요. 카를교에서 걸어서 금방이에요.",
            winter: "짧게 들르기 좋아요. 근처 카페에서 따뜻한 음료를 즐겨 보세요.",
            phrase: ["Can I write a message on the wall?", "벽에 메시지를 써도 되나요?"]
          }
        ]
      },
      {
        name: "프라하 근교 · 지방",
        places: [
          {
            id: "cesky-krumlov",
            name: "Český Krumlov",
            ko: "체스키 크룸로프",
            tags: ["유네스코", "동화 마을"],
            desc: "S자로 굽은 강을 따라 자리한 중세 마을이에요. 성 탑에서 내려다보는 빨간 지붕 마을 풍경이 동화 같아요. 프라하에서 버스로 약 3시간이에요.",
            winter: "겨울엔 성 내부 관람이 제한될 수 있지만 눈 덮인 마을 풍경이 정말 예뻐요.",
            phrase: ["A return ticket to Český Krumlov, please.", "체스키 크룸로프 왕복표 한 장 주세요."]
          },
          {
            id: "kutna-hora",
            name: "Kutná Hora",
            ko: "쿠트나 호라",
            tags: ["유네스코", "당일치기"],
            desc: "프라하에서 기차로 약 1시간이에요. 고딕 양식의 성 바르바라 성당과, 유골로 장식된 세들레츠 납골당이 유명해요.",
            winter: "기차역에서 명소까지 거리가 있으니 버스나 택시를 이용하세요.",
            phrase: ["How do I get to the Sedlec Ossuary from the station?", "역에서 세들레츠 납골당까지 어떻게 가요?"]
          },
          {
            id: "karlovy-vary",
            name: "Karlovy Vary",
            ko: "카를로비 바리",
            tags: ["온천", "산책"],
            desc: "우아한 건물이 늘어선 온천 도시예요. 온천수를 컵에 받아 마시며 회랑을 산책하는 것이 이곳의 전통이에요.",
            winter: "따뜻한 온천수와 스파로 몸을 녹이기 좋아요.",
            phrase: ["Can I drink the spring water here?", "여기 온천수를 마셔도 되나요?"]
          },
          {
            id: "brno",
            name: "Brno",
            ko: "브르노",
            tags: ["대학 도시", "건축"],
            desc: "체코 제2의 도시이자 젊은 대학 도시예요. 유네스코 문화유산인 투겐트하트 저택과 슈필베르크 성이 있어요.",
            winter: "투겐트하트 저택은 예약이 필수예요. 미리 신청하세요.",
            phrase: ["I'd like to book a tour of the villa.", "저택 투어를 예약하고 싶어요."]
          },
          {
            id: "bohemian-switzerland",
            name: "Bohemian Switzerland",
            ko: "보헤미안 스위스 국립공원",
            tags: ["자연", "협곡"],
            desc: "사암 절벽과 협곡이 펼쳐진 국립공원이에요. 거대한 바위 아치 '프라프치츠카 브라나'가 대표 명소예요.",
            winter: "겨울엔 일부 탐방로와 시설이 문을 닫아요. 운영 여부를 꼭 확인하세요.",
            phrase: ["Is this trail open in winter?", "이 탐방로는 겨울에도 열려 있나요?"]
          }
        ]
      }
    ]
  }
];
