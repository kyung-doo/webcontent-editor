export default class Button {
  // 에디터 노출 변수
  static fields = {
    isVisible: {
      type: 'boolean',
      default: true,
      label: 'Show visible'
    },
    speed: { 
      type: 'number', 
      default: 100, 
      label: 'Rotate Speed' 
    },
    clickColor: { 
      type: 'string', 
      default: 'red', 
      label: 
      'Click Color' 
    },
    direction: { 
      type: 'select', 
      label: 'Direction',
      options: ['Left', 'Right'], 
      default: 'Right' 
    },
    children: {
      type: 'array',
      label: 'Children ID',
      default: []
    }
  };

  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    console.log('Script Started', el, fields);

    this.rotation = 0;
    this.originalColor = el.style.backgroundColor;

    el.addEventListener('click', this.clickHandler);

    // 클릭 이벤트 직접 구현
    this.clickHandler = () => {
      console.log('Clicked!', el);
      el.style.backgroundColor = fields.clickColor;
      
      // 0.5초 뒤 원래 색 복구
      setTimeout(() => {
        el.style.backgroundColor = this.originalColor;
      }, 500);
    };

    // DOM에 리스너 부착
    el.addEventListener('click', this.clickHandler);
  }

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    if(fields.direction === 'Right') {
      this.rotation += fields.speed * deltaTime;
    } else {
      this.rotation -= fields.speed * deltaTime;
    }
    
    el.style.transform = `rotate(${this.rotation}deg)`;
  }

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    console.log('Script Destroyed');
    // 메모리 누수 방지를 위해 리스너 제거 필수!
    if (this.clickHandler) {
      el.removeEventListener('click', this.clickHandler);
    }
  }
}