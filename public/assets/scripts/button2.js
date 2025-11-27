export default {
  // 에디터 노출 변수
  fields: {
    
  },


  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    console.log('Script Started', props);
    el.classList.add('transition-all', 'duration-300');
    
    el.addEventListener('click', () => {
      // 클릭할 때마다 'on' 클래스를 켰다 껐다 함
      el.classList.toggle('active');
    });
  },

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    
  },

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    console.log('Script Destroyed');
  }
}