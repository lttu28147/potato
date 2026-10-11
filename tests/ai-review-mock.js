'use strict';
const assert=require('node:assert/strict');
const {reviewThought,ruleBasedReview,reviewActivity}=require('../lib/ai');
async function main(){
  const first='Mình nghĩ AI làm cho sinh viên phụ thuộc vì ai cũng có thể chép đáp án từ AI mà không tự làm.';
  const second='Mình nghĩ AI có thể giúp sinh viên học sâu nếu tự thử giải trước. Ví dụ mình tự viết code 15 phút rồi mới dùng AI giải thích lỗi, nhưng không nên chép nguyên lời giải.';
  const backup=ruleBasedReview('Học với AI',first,second);
  assert.equal(backup.mode,'guided');
  const oldGemini=process.env.GEMINI_API_KEY;
  const oldOpenAI=process.env.OPENAI_API_KEY;
  const oldFetch=global.fetch;
  let captured=null;
  try{
    process.env.GEMINI_API_KEY='FAKE_TEST_KEY';process.env.OPENAI_API_KEY='';
    global.fetch=async(url,opts)=>{
      const body=JSON.parse(opts.body);captured=body.contents[0].parts[0].text;
      return {ok:true,async json(){return {candidates:[{content:{parts:[{text:JSON.stringify({overview:'Bản thứ hai bổ sung ví dụ về tự viết code.',changes:['Bản đầu nhận xét chung, bản sau nêu điều kiện dùng AI.'],strengths:['Nêu rõ quan điểm cá nhân.','Có dẫn chứng tự học.'],improvements:['Làm rõ kết quả của ví dụ code.','Cân nhắc sinh viên mới học chưa biết bắt đầu.'],nextTry:'Nói lại 45 giây: quan điểm, ví dụ, kết luận.',question:'Khi nào AI trở thành sự phụ thuộc?'})}]}}]};}};
    };
    const review=await reviewThought('Học với AI',first,second,'Mình học cách cân bằng.');
    assert.equal(review.mode,'ai');assert.equal(review.provider,'Gemini');
    assert.match(captured,/BẢN NÓI ĐẦU TIÊN/);
    assert.ok(captured.includes(first));assert.ok(captured.includes(second));
    assert.equal(review.improvements.length,2);
    console.log('✓ Mock Gemini review: sends original + revised, validates structured actionable feedback.');
    const perspective=await reviewActivity('perspective','Hai lập trường về AI',first,second,'Tự suy nghĩ trước khi nhờ AI.');
    assert.equal(perspective.mode,'ai');assert.equal(perspective.provider,'Gemini');
    assert.match(captured,/HOẠT ĐỘNG: perspective/);assert.ok(captured.includes(first)&&captured.includes(second));
    const game=await reviewActivity('game','Tam sao thất bản','Tôi thấy mọi người tự thêm chi tiết khi truyền đạt.', 'Thông điệp gốc và bản cuối có khác biệt.');
    assert.equal(game.mode,'ai');assert.match(captured,/HOẠT ĐỘNG: game/);
    console.log('✓ Mock Gemini activity review: perspective and game use real structured provider path.');
    global.fetch=async()=>{throw Error('Offline test');};
    const offline=await reviewThought('Học với AI',first,second);
    assert.equal(offline.mode,'guided');
    console.log('✓ Fallback: explicitly guided, no false claim of AI review.');
  }finally{
    global.fetch=oldFetch;
    if(oldGemini===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldGemini;
    if(oldOpenAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldOpenAI;
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
