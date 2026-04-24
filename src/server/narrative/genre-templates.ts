import type {
  DynamicStatMap,
  StoryAbility,
  StoryCoreState,
  StoryGenre,
} from "@/server/narrative/types";

export type GenreTemplate = {
  genre: StoryGenre;
  currentArc: string;
  gameRules: string[];
  dynamicStats: DynamicStatMap;
  startingAbilities?: StoryAbility[];
  startingFlags?: string[];
};

type StatBlueprint = {
  key: string;
  value: number;
  label: string;
  description: string;
  min?: number;
  max?: number;
};

function buildStats(definitions: StatBlueprint[]): DynamicStatMap {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.key,
      {
        value: definition.value,
        label: definition.label,
        description: definition.description,
        min: definition.min ?? 0,
        max: definition.max ?? 100,
      },
    ]),
  );
}

const COMMON_RULES = [
  "Thế giới phản ứng trung lập, không thiên vị nhân vật chính.",
  "Lựa chọn rủi ro cao có thể dẫn tới thất bại, mất mát, hoặc kết cục xấu.",
  "Mọi thay đổi quan trọng phải được phản ánh nhất quán qua trạng thái, cờ truyện và ký ức thế giới.",
];

export const GENRE_TEMPLATES: Record<StoryGenre, GenreTemplate> = {
  romance: {
    genre: "romance",
    currentArc: "Khởi đầu mối dây tình cảm",
    gameRules: [
      ...COMMON_RULES,
      "Niềm tin và tình cảm tăng chậm nhưng có thể sụp đổ rất nhanh khi phản bội.",
      "Ghen tuông, danh tiếng và thời điểm bộc lộ cảm xúc đều có hậu quả dài hạn.",
    ],
    dynamicStats: buildStats([
      {
        key: "affection",
        value: 45,
        label: "Tình cảm",
        description: "Mức độ rung động và gắn bó tình cảm hiện tại.",
      },
      {
        key: "trust",
        value: 40,
        label: "Tin tưởng",
        description: "Mức độ tin cậy giữa các nhân vật chính.",
      },
      {
        key: "jealousy",
        value: 15,
        label: "Ghen tuông",
        description: "Áp lực cảm xúc tiêu cực có thể gây hiểu lầm hoặc bùng nổ.",
      },
      {
        key: "reputation",
        value: 50,
        label: "Danh tiếng",
        description: "Hình ảnh xã hội của nhân vật trong cộng đồng hoặc nhóm bạn.",
      },
      {
        key: "composure",
        value: 55,
        label: "Bình tĩnh",
        description: "Khả năng giữ ổn định cảm xúc trong tình huống căng thẳng.",
      },
    ]),
  },
  xianxia: {
    genre: "xianxia",
    currentArc: "Nhập đạo và tranh đoạt cơ duyên",
    gameRules: [
      ...COMMON_RULES,
      "Đột phá cảnh giới đòi hỏi tích lũy và thường kéo theo nguy cơ tẩu hỏa nhập ma.",
      "Nhân quả, thanh danh tông môn và nội ma có thể quyết định sống còn về sau.",
    ],
    dynamicStats: buildStats([
      {
        key: "cultivation",
        value: 35,
        label: "Tu vi",
        description: "Mức độ tiến bộ trên con đường tu luyện.",
      },
      {
        key: "spiritual_power",
        value: 50,
        label: "Linh lực",
        description: "Lượng linh lực có thể vận dụng trong chiến đấu hoặc luyện công.",
      },
      {
        key: "karma",
        value: 50,
        label: "Nhân quả",
        description: "Cân bằng giữa thiện duyên, ác nghiệp và món nợ vận mệnh.",
      },
      {
        key: "sect_reputation",
        value: 40,
        label: "Uy danh tông môn",
        description: "Cách người khác nhìn nhận vị thế của ngươi và sư môn.",
      },
      {
        key: "inner_demon",
        value: 20,
        label: "Tâm ma",
        description: "Mức độ dao động nội tâm có thể phá hỏng tu hành.",
      },
    ]),
  },
  fantasy: {
    genre: "fantasy",
    currentArc: "Khởi hành qua miền đất chưa biết",
    gameRules: [
      ...COMMON_RULES,
      "Thế giới giả tưởng có phép thuật, lời thề và di vật mang trọng lượng thực sự.",
      "Thăm dò mạo hiểm có thể đem lại cơ hội lớn nhưng cũng kéo theo tổn thất vĩnh viễn.",
    ],
    dynamicStats: buildStats([
      {
        key: "resolve",
        value: 60,
        label: "Ý chí",
        description: "Khả năng theo đuổi mục tiêu dù thế giới trở nên khắc nghiệt.",
      },
      {
        key: "vitality",
        value: 65,
        label: "Sinh lực",
        description: "Tình trạng thể chất tổng quát của nhân vật.",
      },
      {
        key: "mana",
        value: 50,
        label: "Pháp lực",
        description: "Nguồn lực siêu nhiên để dùng phép hoặc kích hoạt di vật.",
      },
      {
        key: "renown",
        value: 35,
        label: "Danh vọng",
        description: "Danh tiếng của nhân vật trong vùng đất và giữa các phe phái.",
      },
      {
        key: "threat",
        value: 20,
        label: "Hiểm họa",
        description: "Mức độ nguy hiểm trực tiếp đang bủa vây hành trình.",
      },
    ]),
  },
  horror: {
    genre: "horror",
    currentArc: "Chạm vào vùng cấm",
    gameRules: [
      ...COMMON_RULES,
      "Nỗi sợ và sự thật không bao giờ miễn phí; càng biết nhiều, cái giá thường càng nặng.",
      "Sự sống sót quan trọng hơn chiến thắng vẻ vang.",
    ],
    dynamicStats: buildStats([
      {
        key: "sanity",
        value: 60,
        label: "Lý trí",
        description: "Khả năng giữ nhận thức ổn định trước điều kinh hoàng.",
      },
      {
        key: "fear",
        value: 25,
        label: "Sợ hãi",
        description: "Mức độ hoảng loạn bào mòn quyết định và hành động.",
      },
      {
        key: "injury",
        value: 20,
        label: "Thương tích",
        description: "Mức độ tổn hại cơ thể; càng cao càng nguy hiểm.",
      },
      {
        key: "light_source",
        value: 55,
        label: "Nguồn sáng",
        description: "Mức độ an toàn tương đối từ ánh sáng, pin, lửa hoặc thiết bị.",
      },
      {
        key: "threat_level",
        value: 35,
        label: "Mức đe dọa",
        description: "Sức ép của thực thể, hiện tượng hoặc tai họa đang săn đuổi.",
      },
    ]),
  },
  mystery: {
    genre: "mystery",
    currentArc: "Lần theo mối đầu tiên",
    gameRules: [
      ...COMMON_RULES,
      "Bằng chứng phải được tích lũy trước khi có thể kết luận một cách đáng tin.",
      "Nghi ngờ từ xã hội hoặc cơ quan quyền lực có thể phá hỏng điều tra.",
    ],
    dynamicStats: buildStats([
      {
        key: "evidence",
        value: 20,
        label: "Chứng cứ",
        description: "Lượng thông tin xác thực đã thu thập được.",
      },
      {
        key: "suspicion",
        value: 20,
        label: "Nghi ngờ",
        description: "Mức độ nhân vật bị theo dõi, nghi kỵ hoặc dính vào tâm điểm điều tra.",
      },
      {
        key: "police_pressure",
        value: 15,
        label: "Áp lực điều tra",
        description: "Sức ép từ cơ quan chức năng hoặc người nắm quyền.",
      },
      {
        key: "public_trust",
        value: 45,
        label: "Niềm tin công chúng",
        description: "Mức độ người ngoài sẵn sàng tin và hỗ trợ nhân vật.",
      },
      {
        key: "focus",
        value: 60,
        label: "Tập trung",
        description: "Độ sắc bén khi ghép nối dữ kiện và phát hiện mâu thuẫn.",
      },
    ]),
  },
  "sci-fi": {
    genre: "sci-fi",
    currentArc: "Hệ thống bắt đầu lệch chuẩn",
    gameRules: [
      ...COMMON_RULES,
      "Công nghệ mạnh nhưng không trung lập; mọi can thiệp đều để lại dấu vết.",
      "Thiếu tài nguyên hoặc lỗi hệ thống có thể đẩy tình huống sang khủng hoảng rất nhanh.",
    ],
    dynamicStats: buildStats([
      {
        key: "system_integrity",
        value: 70,
        label: "Độ ổn định hệ thống",
        description: "Tình trạng thiết bị, tàu, mạng lưới hoặc môi trường kỹ thuật.",
      },
      {
        key: "resources",
        value: 55,
        label: "Tài nguyên",
        description: "Nhiên liệu, điện năng, tín dụng hoặc vật tư còn lại.",
      },
      {
        key: "intel",
        value: 35,
        label: "Dữ liệu tình báo",
        description: "Mức độ hiểu biết về mối đe dọa, kẻ thù hoặc bí ẩn công nghệ.",
      },
      {
        key: "crew_trust",
        value: 45,
        label: "Niềm tin tổ đội",
        description: "Sự phối hợp và tin cậy giữa nhân vật với đồng đội.",
      },
      {
        key: "exposure",
        value: 20,
        label: "Lộ diện",
        description: "Mức độ nhân vật hoặc nhóm đã bị phát hiện, định vị hoặc truy dấu.",
      },
    ]),
  },
  "school-life": {
    genre: "school-life",
    currentArc: "Một học kỳ bắt đầu lệch quỹ đạo",
    gameRules: [
      ...COMMON_RULES,
      "Mỗi quyết định ở trường đều ảnh hưởng tới quan hệ, danh tiếng và cơ hội lâu dài.",
      "Những vấn đề tưởng nhỏ có thể tích tụ thành khủng hoảng xã hội hoặc cảm xúc.",
    ],
    dynamicStats: buildStats([
      {
        key: "energy",
        value: 60,
        label: "Năng lượng",
        description: "Mức độ thể lực và tinh thần để theo kịp nhịp sống học đường.",
      },
      {
        key: "grades",
        value: 55,
        label: "Kết quả học tập",
        description: "Hiệu quả học hành và khả năng giữ vị thế trong trường.",
      },
      {
        key: "reputation",
        value: 50,
        label: "Danh tiếng",
        description: "Cách bạn bè, giáo viên và các nhóm trong trường nhìn nhận nhân vật.",
      },
      {
        key: "friendship",
        value: 45,
        label: "Tình bạn",
        description: "Độ gắn kết với bạn bè và đồng minh trong trường.",
      },
      {
        key: "pressure",
        value: 25,
        label: "Áp lực",
        description: "Sức ép tích lũy từ kỳ vọng, bí mật và xung đột.",
      },
    ]),
  },
  "slice-of-life": {
    genre: "slice-of-life",
    currentArc: "Nhịp sống bắt đầu thay đổi",
    gameRules: [
      ...COMMON_RULES,
      "Căng thẳng thường đến từ các lựa chọn đời thường nhưng để lại dư âm dài lâu.",
      "Sự ổn định vật chất, cảm xúc và quan hệ đều quan trọng như nhau.",
    ],
    dynamicStats: buildStats([
      {
        key: "happiness",
        value: 55,
        label: "Hạnh phúc",
        description: "Mức độ hài lòng chung với đời sống hiện tại.",
      },
      {
        key: "money",
        value: 45,
        label: "Tiền bạc",
        description: "Nguồn lực tài chính để duy trì cuộc sống hoặc theo đuổi lựa chọn mới.",
      },
      {
        key: "energy",
        value: 60,
        label: "Năng lượng",
        description: "Khả năng xoay xở giữa công việc, gia đình và bản thân.",
      },
      {
        key: "reputation",
        value: 50,
        label: "Uy tín",
        description: "Đánh giá của cộng đồng gần gũi với nhân vật.",
      },
      {
        key: "belonging",
        value: 50,
        label: "Cảm giác thuộc về",
        description: "Mức độ nhân vật cảm thấy mình có chỗ đứng thật sự.",
      },
    ]),
  },
  survival: {
    genre: "survival",
    currentArc: "Chống chọi để qua ngày đầu",
    gameRules: [
      ...COMMON_RULES,
      "Sống sót là ưu tiên số một; cạn tài nguyên hoặc thương tích nặng có thể chấm dứt hành trình.",
      "Mọi quyết định liều lĩnh đều tích lũy hậu quả vật chất rõ ràng.",
    ],
    dynamicStats: buildStats([
      {
        key: "health",
        value: 70,
        label: "Sức khỏe",
        description: "Khả năng chịu đựng thương tích, bệnh tật và kiệt quệ.",
      },
      {
        key: "stamina",
        value: 65,
        label: "Thể lực",
        description: "Năng lượng tức thời để di chuyển, chiến đấu và lao động.",
      },
      {
        key: "supplies",
        value: 50,
        label: "Tiếp tế",
        description: "Lương thực, nước uống và vật phẩm sống còn.",
      },
      {
        key: "shelter",
        value: 40,
        label: "Nơi trú ẩn",
        description: "Mức độ an toàn của chỗ nghỉ trước thời tiết hoặc săn đuổi.",
      },
      {
        key: "danger",
        value: 25,
        label: "Nguy hiểm",
        description: "Cường độ mối đe dọa đang bao quanh nhân vật.",
      },
    ]),
  },
  historical: {
    genre: "historical",
    currentArc: "Vận mệnh đổi chiều trong thời loạn",
    gameRules: [
      ...COMMON_RULES,
      "Bối cảnh lịch sử đòi hỏi hành vi phù hợp với địa vị, lễ nghi và trật tự quyền lực.",
      "Danh tiết, uy tín và hậu quả chính trị có thể nguy hiểm không kém bạo lực trực tiếp.",
    ],
    dynamicStats: buildStats([
      {
        key: "standing",
        value: 45,
        label: "Thân phận",
        description: "Vị thế xã hội và mức độ được công nhận trong trật tự đương thời.",
      },
      {
        key: "favor",
        value: 35,
        label: "Ân sủng",
        description: "Mức độ được người có quyền thế nâng đỡ hoặc bảo vệ.",
      },
      {
        key: "honor",
        value: 55,
        label: "Danh tiết",
        description: "Giá trị danh dự và danh tiếng đạo đức của nhân vật.",
      },
      {
        key: "resources",
        value: 45,
        label: "Nguồn lực",
        description: "Nhân lực, tài vật và mạng lưới hậu thuẫn thực tế.",
      },
      {
        key: "peril",
        value: 20,
        label: "Hiểm cảnh",
        description: "Mức độ cận kề của biến cố chính trị, chiến tranh hoặc thanh trừng.",
      },
    ]),
  },
  adventure: {
    genre: "adventure",
    currentArc: "Lời gọi lên đường",
    gameRules: [
      ...COMMON_RULES,
      "Cơ hội lớn luôn đi kèm địa hình lạ, đối thủ mới và tài nguyên hao hụt.",
      "Khám phá thành công không đồng nghĩa an toàn; hành trình liên tục thử thách bản lĩnh.",
    ],
    dynamicStats: buildStats([
      {
        key: "resolve",
        value: 60,
        label: "Quyết tâm",
        description: "Động lực bám trụ với hành trình dù tình thế xấu đi.",
      },
      {
        key: "supplies",
        value: 55,
        label: "Vật tư",
        description: "Nguồn lực thực tế để tiếp tục chuyến đi.",
      },
      {
        key: "momentum",
        value: 50,
        label: "Đà tiến",
        description: "Khả năng giữ nhịp, chủ động và lợi thế trên đường phiêu lưu.",
      },
      {
        key: "renown",
        value: 35,
        label: "Tiếng tăm",
        description: "Danh tiếng của nhân vật với người lạ, đồng minh và đối thủ.",
      },
      {
        key: "danger",
        value: 25,
        label: "Nguy hiểm",
        description: "Mức độ đe dọa từ môi trường, cạm bẫy hoặc truy đuổi.",
      },
    ]),
  },
  drama: {
    genre: "drama",
    currentArc: "Những vết nứt bắt đầu lộ ra",
    gameRules: [
      ...COMMON_RULES,
      "Cảm xúc, trách nhiệm và áp lực xã hội thường gây tổn thương sâu hơn xung đột trực diện.",
      "Không phải mọi lựa chọn đúng về đạo đức đều đem lại kết quả dễ chịu.",
    ],
    dynamicStats: buildStats([
      {
        key: "stress",
        value: 30,
        label: "Căng thẳng",
        description: "Sức ép tâm lý đang dồn lên nhân vật.",
      },
      {
        key: "trust",
        value: 45,
        label: "Niềm tin",
        description: "Mức độ người khác còn sẵn lòng đặt lòng tin vào nhân vật.",
      },
      {
        key: "reputation",
        value: 50,
        label: "Danh tiếng",
        description: "Cách cộng đồng hoặc gia đình đánh giá nhân vật.",
      },
      {
        key: "self_control",
        value: 55,
        label: "Tự chủ",
        description: "Khả năng kiềm giữ cảm xúc và hành động khi khủng hoảng.",
      },
      {
        key: "pressure",
        value: 35,
        label: "Sức ép",
        description: "Những nghĩa vụ và xung đột đang ép nhân vật phải quyết định.",
      },
    ]),
  },
  politics: {
    genre: "politics",
    currentArc: "Bàn cờ quyền lực hé lộ",
    gameRules: [
      ...COMMON_RULES,
      "Mỗi lựa chọn quyền lực đều tạo ra người được lợi và người mang thù.",
      "Thông tin, ảnh hưởng và tính chính danh thường quyết định kết cục hơn vũ lực thuần túy.",
    ],
    dynamicStats: buildStats([
      {
        key: "influence",
        value: 50,
        label: "Ảnh hưởng",
        description: "Khả năng bẻ lái ý kiến và quyết định của người khác.",
      },
      {
        key: "legitimacy",
        value: 45,
        label: "Chính danh",
        description: "Mức độ quyền lực của nhân vật được chấp nhận công khai.",
      },
      {
        key: "secrecy",
        value: 55,
        label: "Bí mật",
        description: "Khả năng che giấu nước đi và điểm yếu chiến lược.",
      },
      {
        key: "alliance",
        value: 40,
        label: "Liên minh",
        description: "Độ bền của mạng lưới ủng hộ quanh nhân vật.",
      },
      {
        key: "exposure",
        value: 20,
        label: "Lộ sơ hở",
        description: "Mức độ kế hoạch và điểm yếu đã bị người khác nắm được.",
      },
    ]),
  },
  custom: {
    genre: "custom",
    currentArc: "Khởi đầu của một thế giới riêng",
    gameRules: [
      ...COMMON_RULES,
      "Thống kê và quy tắc có thể thay đổi theo tiền đề truyện, nhưng hậu quả luôn phải logic.",
      "Khi chưa rõ hệ quy chiếu, hãy ưu tiên những trạng thái phản ánh căng thẳng, nguồn lực và quan hệ.",
    ],
    dynamicStats: buildStats([
      {
        key: "resolve",
        value: 55,
        label: "Ý chí",
        description: "Khả năng tiếp tục theo đuổi mục tiêu trong bối cảnh chưa quen thuộc.",
      },
      {
        key: "resources",
        value: 50,
        label: "Nguồn lực",
        description: "Những gì nhân vật có thể dựa vào để hành động.",
      },
      {
        key: "pressure",
        value: 25,
        label: "Áp lực",
        description: "Sức ép đang siết dần lên nhân vật và thế giới xung quanh.",
      },
      {
        key: "trust",
        value: 45,
        label: "Tin cậy",
        description: "Độ tin tưởng mà người khác dành cho nhân vật.",
      },
      {
        key: "danger",
        value: 20,
        label: "Nguy cơ",
        description: "Mức độ đe dọa đang tăng lên trong cốt truyện.",
      },
    ]),
  },
};

export function getGenreTemplate(genre: StoryGenre): GenreTemplate {
  return GENRE_TEMPLATES[genre] ?? GENRE_TEMPLATES.custom;
}

export function buildInitialCoreState(
  genre: StoryGenre,
  tone: string,
  turn = 0,
): StoryCoreState {
  const template = getGenreTemplate(genre);
  return {
    genre,
    tone,
    currentArc: template.currentArc,
    turn,
    gameOver: false,
    endingType: null,
    gameRules: [...template.gameRules],
  };
}
