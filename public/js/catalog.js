export const CATEGORIES = [
  {id:'all',label:'Tất cả'}, {id:'ban-than',label:'Bản thân'}, {id:'cong-nghe',label:'Công nghệ'},
  {id:'hoc-tap',label:'Học tập'}, {id:'ket-noi',label:'Kết nối'}, {id:'xa-hoi',label:'Xã hội'}
];
export const TOPICS = [
  {id:'t01',category:'cong-nghe',title:'AI có khiến chúng ta ngại suy nghĩ?',prompt:'Khi nào AI giúp bạn học tốt hơn, và khi nào nó đang suy nghĩ thay bạn?',icon:'brain'},
  {id:'t02',category:'ban-than',title:'Nếu không có mạng xã hội trong một tuần?',prompt:'Bạn nghĩ điều gì trong cuộc sống sẽ thay đổi rõ nhất? Vì sao?',icon:'leaf'},
  {id:'t03',category:'ket-noi',title:'Lần gần nhất bạn thực sự lắng nghe?',prompt:'Kể về một lần bạn lắng nghe ai đó mà không vội đưa lời khuyên.',icon:'users'},
  {id:'t04',category:'hoc-tap',title:'Điểm số có phản ánh năng lực?',prompt:'Hãy nêu quan điểm cùng một trải nghiệm cụ thể của chính bạn.',icon:'book'},
  {id:'t05',category:'xa-hoi',title:'Người trẻ có trách nhiệm gì với cộng đồng?',prompt:'Nếu chỉ có một buổi chiều, bạn sẽ làm điều gì hữu ích?',icon:'globe'},
  {id:'t06',category:'ban-than',title:'Một quan điểm bạn từng thay đổi?',prompt:'Điều gì khiến bạn thay đổi suy nghĩ? Sự thay đổi ấy có nghĩa gì?',icon:'spark'},
  {id:'t07',category:'cong-nghe',title:'Thuật toán có quyết định thứ ta tin?',prompt:'Nội dung xuất hiện trên màn hình ảnh hưởng thế nào đến cách nhìn của bạn?',icon:'layers'},
  {id:'t08',category:'ket-noi',title:'Nhắn tin hay gặp trực tiếp?',prompt:'Trong một tình huống khó, hình thức nào giúp hiểu nhau hơn?',icon:'message'},
  {id:'t09',category:'hoc-tap',title:'Có cần học thuộc trong thời đại AI?',prompt:'Bộ nhớ và việc tự ghi nhớ quan trọng thế nào khi ta có thể tra cứu?',icon:'book'},
  {id:'t10',category:'ban-than',title:'Điều gì khiến bạn tự hào về chính mình?',prompt:'Một hành động nhỏ nào thể hiện giá trị mà bạn trân trọng?',icon:'heart'},
  {id:'t11',category:'xa-hoi',title:'Sự tử tế có thể học được không?',prompt:'Hãy đề xuất một hành động giúp môi trường học tập tử tế hơn.',icon:'heart'},
  {id:'t12',category:'cong-nghe',title:'Quyền riêng tư có đáng đổi lấy tiện lợi?',prompt:'Ranh giới dữ liệu cá nhân bạn sẽ không muốn vượt qua là gì?',icon:'shield'},
  {id:'t13',category:'ket-noi',title:'Một tình bạn tốt được xây từ điều gì?',prompt:'Có trải nghiệm nào thay đổi cách bạn hiểu về tình bạn?',icon:'users'},
  {id:'t14',category:'hoc-tap',title:'Làm việc nhóm thế nào cho công bằng?',prompt:'Nếu một người ít nói nhưng làm tốt, nhóm nên đánh giá ra sao?',icon:'users'},
  {id:'t15',category:'ban-than',title:'Tự tin có phải luôn nói thật nhiều?',prompt:'Bạn định nghĩa sự tự tin như thế nào bằng ví dụ cụ thể?',icon:'spark'},
  {id:'t16',category:'xa-hoi',title:'Vì sao ta nên biết kiểm chứng tin?',prompt:'Bạn sẽ phản ứng ra sao khi nhận tin gây hoang mang từ bạn bè?',icon:'shield'},
  {id:'t17',category:'cong-nghe',title:'Một ngày không có điện thoại?',prompt:'Bạn sẽ làm gì với khoảng thời gian bất ngờ được trả lại?',icon:'clock'},
  {id:'t18',category:'hoc-tap',title:'Thất bại là một kiểu học?',prompt:'Một lần mắc lỗi đã giúp bạn học điều gì?',icon:'spark'},
  {id:'t19',category:'ket-noi',title:'Làm sao bất đồng mà vẫn tôn trọng?',prompt:'Nêu cách bạn tranh luận với một người bạn thân nhưng trái ý.',icon:'message'},
  {id:'t20',category:'xa-hoi',title:'Làm sao giữ giá trị Việt trong thời đại số?',prompt:'Một thói quen, câu chuyện hoặc giá trị nào bạn muốn truyền lại?',icon:'globe'},
  {id:'t21',category:'ban-than',title:'Bạn muốn được nhớ đến vì điều gì?',prompt:'Một giá trị cốt lõi bạn muốn sống theo mỗi ngày là gì?',icon:'heart'},
  {id:'t22',category:'hoc-tap',title:'Nên chọn việc dễ hay việc giúp mình lớn lên?',prompt:'Bạn đang né tránh điều gì vì sợ mình chưa đủ giỏi?',icon:'book'},
  {id:'t23',category:'cong-nghe',title:'Có nên tin lời khuyên từ AI?',prompt:'Bạn sẽ kiểm tra câu trả lời từ AI bằng những cách nào?',icon:'shield'},
  {id:'t24',category:'ket-noi',title:'Một cuộc trò chuyện đáng nhớ có gì?',prompt:'Hãy nhớ lại một cuộc nói chuyện khiến bạn cảm thấy được thấu hiểu.',icon:'message'},
  {id:'t25',category:'xa-hoi',title:'Người trẻ cần làm gì trước tin giả?',prompt:'Bạn sẽ giúp người thân kiểm chứng một tin tức thế nào?',icon:'globe'},
  {id:'t26',category:'ban-than',title:'Bạn đang thật sự muốn gì?',prompt:'Điều bạn lựa chọn vì bản thân khác gì với điều bạn làm vì số đông?',icon:'spark'},
  {id:'t27',category:'hoc-tap',title:'Học để hiểu hay học để thi?',prompt:'Có cách nào vừa học tốt bài thi vừa hiểu bản chất?',icon:'book'},
  {id:'t28',category:'ket-noi',title:'Chúng ta có đang quá vội để hiểu nhau?',prompt:'Hãy kể một lần bạn hiểu nhầm người khác và đã tháo gỡ ra sao.',icon:'users'}
];
export const QUESTS = [
  {id:'quest-1',category:'Kết nối',title:'10 phút không màn hình',duration:'10 phút',icon:'users',description:'Trò chuyện trực tiếp với một người bạn, không nhìn điện thoại.',steps:['Chọn một người bạn và dành trọn 10 phút cho cuộc trò chuyện.','Đặt ít nhất hai câu hỏi mở và lắng nghe hết câu.','Ghi lại điều bạn đã hiểu hơn về họ.']},
  {id:'quest-2',category:'Tự chủ',title:'15 phút tự giải trước AI',duration:'15 phút',icon:'brain',description:'Tự giải một vấn đề học tập trước khi mở bất kỳ trợ lý AI nào.',steps:['Chọn một vấn đề thực sự đang cần giải.','Ghi lại ít nhất hai cách tiếp cận của riêng bạn.','Sau 15 phút mới dùng AI để đối chiếu và tự kết luận.']},
  {id:'quest-3',category:'Bản sắc',title:'Lắng nghe một thế hệ',duration:'20 phút',icon:'heart',description:'Hỏi người thân về một giá trị sống họ muốn giữ gìn.',steps:['Chọn một thành viên trong gia đình.','Hỏi về một giá trị hoặc bài học quan trọng họ từng trải qua.','Viết điều bạn đồng tình và điều bạn nghĩ khác.']},
  {id:'quest-4',category:'Tư duy',title:'Hai mặt của một vấn đề',duration:'12 phút',icon:'layers',description:'Tự bảo vệ cả hai phía của một câu hỏi mà bạn quan tâm.',steps:['Viết 3 lý do ủng hộ.','Viết 3 lý do phản đối, không dựa vào AI.','Đưa ra một kết luận có điều kiện của riêng mình.']},
  {id:'quest-5',category:'Tập trung',title:'Một trang giấy yên tĩnh',duration:'10 phút',icon:'clock',description:'Tắt thông báo, dùng giấy để tự lên kế hoạch một ngày.',steps:['Đặt điện thoại ngoài tầm tay.','Viết ra ba việc thật sự quan trọng.','Chọn việc đầu tiên và bắt đầu trong 5 phút.']},
  {id:'quest-6',category:'Xã hội',title:'Kiểm chứng một thông tin',duration:'15 phút',icon:'shield',description:'Kiểm tra một thông tin đang được chia sẻ trước khi tin hoặc gửi lại.',steps:['Chọn một thông tin có thể kiểm chứng.','Tìm nguồn gốc và đối chiếu ít nhất hai nguồn đáng tin.','Ghi rõ điều đã xác minh và phần còn chưa chắc chắn.']},
  {id:'quest-7',category:'Kết nối',title:'Hỏi mà không phán xét',duration:'15 phút',icon:'message',description:'Trò chuyện với người có quan điểm khác và tìm hiểu lý do của họ.',steps:['Chọn một bất đồng nhỏ, an toàn.','Đặt hai câu hỏi để hiểu thay vì phản bác ngay.','Tóm tắt góc nhìn của họ một cách công bằng.']},
  {id:'quest-8',category:'Học tập',title:'Nhớ lại không nhìn tài liệu',duration:'10 phút',icon:'book',description:'Thử tự nhớ lại nội dung đã học bằng sơ đồ nhỏ.',steps:['Chọn một chủ đề đã học.','Cất tài liệu và vẽ sơ đồ từ trí nhớ.','Mở lại tài liệu để tự kiểm tra phần bỏ sót.']},
  {id:'quest-9',category:'Bản thân',title:'Lá thư từ chính mình',duration:'10 phút',icon:'heart',description:'Viết một lá thư nhắc nhở bản thân về một giá trị quan trọng.',steps:['Chọn một giá trị bạn theo đuổi.','Kể một trải nghiệm gắn với giá trị đó.','Viết một hành động bạn có thể thực hiện tuần này.']},
  {id:'quest-10',category:'Sáng tạo',title:'Giải quyết vấn đề trong lớp',duration:'25 phút',icon:'spark',description:'Quan sát một bất tiện trong lớp và đề xuất một thử nghiệm nhỏ.',steps:['Quan sát và mô tả một khó khăn cụ thể.','Hỏi thêm ý kiến của ít nhất một người liên quan.','Đề xuất cách thử nghiệm đơn giản, ít tốn kém.']},
  {id:'quest-11',category:'Kết nối',title:'Một lời cảm ơn có lý do',duration:'5 phút',icon:'heart',description:'Gửi một lời cảm ơn cụ thể đến người đã giúp bạn.',steps:['Nghĩ về một sự giúp đỡ thật sự.','Nói rõ hành động nào bạn biết ơn.','Lắng nghe phản hồi của họ.']},
  {id:'quest-12',category:'Tập trung',title:'Đi bộ quan sát không tai nghe',duration:'10 phút',icon:'leaf',description:'Đi bộ ở nơi an toàn và để ý những điều thường bị bỏ qua.',steps:['Chọn khu vực phù hợp và an toàn.','Đi bộ và chú ý 5 chi tiết xung quanh.','Ghi lại một suy nghĩ xuất hiện khi bạn không lướt mạng.']}
];
export const DILEMMAS = [
  {id:'d1',title:'AI trong học tập',a:'Sinh viên nên được dùng AI khi làm bài tập.',b:'Sinh viên không nên dùng AI cho bài tập cá nhân.',hint:'Xem xét công bằng, động lực học, cách đánh giá và khả năng tiếp cận.'},
  {id:'d2',title:'Điểm số và năng lực',a:'Điểm thi là thước đo cần thiết và hữu ích.',b:'Điểm thi không nên được coi là thước đo chính.',hint:'Xem xét mục tiêu đo lường, áp lực, các cách đánh giá thay thế.'},
  {id:'d3',title:'Điện thoại ở trường',a:'Nên hạn chế mạnh điện thoại trong giờ học.',b:'Nên cho phép dùng điện thoại có kiểm soát.',hint:'Xem xét mức độ tập trung, học liệu, nhu cầu liên lạc.'},
  {id:'d4',title:'Học online và offline',a:'Học trực tiếp nên là hình thức chủ đạo.',b:'Học trực tuyến nên là hình thức chủ đạo.',hint:'Xem xét sự kết nối, chi phí, vùng xa, cách thực hành.'},
  {id:'d5',title:'Thành công cá nhân',a:'Ổn định là nền tảng của một cuộc sống tốt.',b:'Dám thử thách là nền tảng của một cuộc sống tốt.',hint:'Xem xét hoàn cảnh, trách nhiệm và khả năng chấp nhận rủi ro.'},
  {id:'d6',title:'Mạng xã hội',a:'Mạng xã hội giúp con người gần nhau hơn.',b:'Mạng xã hội làm giảm chất lượng kết nối.',hint:'Xem xét quan hệ ở xa, chiều sâu kết nối và thói quen sử dụng.'}
];
export const TRUTH_PROMPTS = [
  'Một lần bạn thay đổi quan điểm vì nghe người khác nói là khi nào?',
  'Bạn thường làm gì khi không hiểu bài nhưng ngại hỏi?',
  'Điều tử tế nhỏ nào bạn nhận được gần đây?',
  'Bạn đã từng đánh giá ai quá vội rồi nhận ra mình sai chưa?',
  'Một ước mơ bạn muốn thực hiện nhưng chưa dám bắt đầu?',
  'Bạn tự hào về điều gì trong một năm qua?',
  'Lần cuối bạn ngồi nghe bạn bè mà không nhìn điện thoại?',
  'Một thói quen bạn muốn thay đổi trong 30 ngày tới?',
  'Có điều gì người khác thường hiểu nhầm về bạn?',
  'Nếu có thể nhắn cho bản thân 3 năm trước, bạn sẽ nói gì?'
];
export const DARE_PROMPTS = [
  'Trong 30 giây, nói 3 điều bạn thực sự trân trọng ở bản thân.',
  'Đặt một câu hỏi mở khiến cả nhóm muốn cùng suy nghĩ.',
  'Nói một lời cảm ơn cụ thể với ai đó trong nhóm.',
  'Thử bảo vệ một quan điểm trái với ý bạn trong 40 giây.',
  'Kể một câu chuyện ngắn với mở đầu – tình huống – bài học.',
  'Diễn tả một đồ vật quen thuộc mà không nói tên, để nhóm đoán.',
  'Trong 1 phút, dẫn một cuộc thảo luận mà bạn không được cắt lời.',
  'Nêu một giải pháp sáng tạo cho vấn đề nhóm đang gặp.',
  'Kể 5 điều bạn nhớ về cuộc trò chuyện trước đó.',
  'Rủ một người khác cùng đặt ra một thử thách tốt cho nhóm.'
];
export const SPY_PAIRS = [
  ['Phở','Bún bò'],['Thư viện','Hiệu sách'],['Xe đạp','Xe máy'],['Biển','Hồ'],
  ['Thuyết trình','Tranh biện'],['Trà sữa','Cà phê'],['Ký túc xá','Nhà trọ'],
  ['Sân bóng','Phòng gym'],['Lớp học','Hội trường'],['Đọc sách','Nghe podcast'],
  ['Bảo tàng','Triển lãm'],['Mưa phùn','Mưa rào']
];
export const RELAY_PHRASES = [
  'Một nhóm sinh viên trồng ba cây nhỏ bên cửa sổ thư viện sau giờ học.',
  'Vào chiều thứ Sáu, một bạn nhặt được chìa khóa màu xanh trước cổng trường.',
  'Cô giáo nhờ cả lớp vẽ bản đồ ước mơ trong vòng bảy phút.',
  'Chiếc ba lô đỏ nằm cạnh hai quyển sách dưới bàn cuối lớp.',
  'Mỗi tối thứ Tư, bốn người bạn cùng nhau luyện kể chuyện không nhìn điện thoại.',
  'Một con mèo trắng ngồi cạnh tiệm hoa đúng lúc cơn mưa vừa dứt.'
];
