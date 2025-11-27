export default {
  // 에디터 노출 변수
  fields: {
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
  },

  // 내부 상태 저장용 변수 (클로저 대신 객체 속성 활용 추천)
  _rotation: 0,
  _originalColor: '',
  _clickHandler: null, // 리스너 제거를 위해 핸들러 저장

  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    console.log('Script Started', props);
    this._rotation = 0;
    this._originalColor = el.style.backgroundColor;

    el.addEventListener('click', this._clickHandler);

    // 클릭 이벤트 직접 구현
    this._clickHandler = () => {
      console.log('Clicked!');
      el.style.backgroundColor = fields.clickColor;
      
      // 0.5초 뒤 원래 색 복구
      setTimeout(() => {
         el.style.backgroundColor = this._originalColor;
      }, 500);
    };

    // DOM에 리스너 부착
    el.addEventListener('click', this._clickHandler);
  },

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    // deltaTime을 곱해야 프레임이 떨어져도 속도가 일정함
    // speed가 100이면 1초에 100도 회전
    if(fields.direction === 'Right') {
      this._rotation += fields.speed * deltaTime;
    } else {
      this._rotation -= fields.speed * deltaTime;
    }
    
    el.style.transform = `rotate(${this._rotation}deg)`;
  },

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    console.log('Script Destroyed');
    // 메모리 누수 방지를 위해 리스너 제거 필수!
    if (this._clickHandler) {
      el.removeEventListener('click', this._clickHandler);
    }
  }
}