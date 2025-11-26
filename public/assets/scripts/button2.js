export default {
  // 에디터 노출 변수
  fields: {
    
  },


  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    console.log('Script Started', props);
  },

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    
  },

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    console.log('Script Destroyed');
  }
}