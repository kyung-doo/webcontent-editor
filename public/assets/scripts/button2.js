export default class Button2 {
  // 에디터 노출 변수
  static fields = {
    
  };

  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    console.log('Script Started', el, fields);
    el.classList.add('transition-all', 'duration-300');
    this.clickListener = () => {
      el.classList.toggle('on');
    }
    el.addEventListener('click', this.clickListener);
  }

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    
  }

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    console.log('Script Destroyed');
    el.removeEventListener('click', this.clickListener);
  }
}