// Unity의 Start(), Update(), OnClick()과 유사
export default {
  // 컴포넌트가 처음 부착되거나 로드될 때 실행 (Start)
  onStart: (element, props) => {
    console.log('Component Started on:', element.id);
    element.style.transition = 'all 0.3s';
    element.style.cursor = 'pointer';
  },

  // 클릭 이벤트가 발생했을 때 실행 (OnClick)
  onClick: (element, props) => {
    alert(`클릭됨! ID: ${element.id}`);
    element.style.backgroundColor = 'red';
  }
}