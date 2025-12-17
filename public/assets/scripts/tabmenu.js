export default class Tabmenu {
  // 에디터 노출 변수
  static fields = {
    menuIds: {
      type: 'array',
      label: '탭메뉴 ID',
      default: []
    }
  };

  // 1. 시작 (초기화)
  onStart (el, props, fields) {
    this.menus = fields.menuIds.map(id => el.querySelector(`#${id}`));
    const handle = this.clickHandler.bind(this);
    this.menus.forEach((menu, i) => {
      menu.addEventListener('click', handle);
    });
  }

  clickHandler ( e ) {
    this.menus.forEach(menu => {
      menu.classList.remove('active')
    });
    e.currentTarget.classList.add('active')
  }

  // 2. 매 프레임 업데이트 (deltaTime: 초 단위 경과 시간)
  onUpdate (el, props, fields, deltaTime) {
    
  }

  // 3. 파괴 (정리)
  onDestroy (el, props, fields) {
    const handle = this.clickHandler.bind(this);
    this.menus.forEach(menu => {
      menu.removeEventListener('click', handle);
    });
  }
}