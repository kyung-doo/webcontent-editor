// =============================================================================
// 1. SYSTEM CONFIGURATION
// =============================================================================
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;
// 룰러(자) 두께 (px)
export const RULER_THICKNESS = 30;

// 드래그로 간주할 최소 이동 거리 (px)
export const DRAG_THRESHOLD = 3;

// 박스 생성 최소 크기 (px)
export const ELEMENT_MIN_SIZE = 20;

// 다중 선택 박스 생성 최소 크기 (px)
export const SELECTION_MIN_SIZE = 20;



// =============================================================================
// 2. GLOBAL VALUES (모든 속성에 공통적으로 들어갈 수 있는 값)
// =============================================================================
export const GLOBAL_VALUES = ['inherit', 'initial', 'revert', 'revert-layer', 'unset'];

// =============================================================================
// 3. EXTENSIVE PROPERTY VALUES (속성별 상세 값 목록)
// =============================================================================

export const PROPERTY_VALUES: { [key: string]: string[] } = {
  // --- Layout: Display ---
  'display': [
    'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 
    'flow-root', 'none', 'contents', 'table', 'table-row', 'table-cell', 'list-item', 
    'run-in', 'ruby', 'ruby-base', 'ruby-text', 'ruby-base-container', 'ruby-text-container'
  ],

  // --- Layout: Position ---
  'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  
  // --- Layout: Flexbox & Grid ---
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': [
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 
    'start', 'end', 'left', 'right', 'normal', 'stretch'
  ],
  'align-items': [
    'stretch', 'flex-start', 'flex-end', 'center', 'baseline', 'first baseline', 'last baseline', 
    'start', 'end', 'self-start', 'self-end'
  ],
  'align-content': [
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 
    'stretch', 'start', 'end', 'baseline', 'normal'
  ],
  'align-self': [
    'auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch'
  ],
  'grid-auto-flow': ['row', 'column', 'row dense', 'column dense'],

  // --- Layout: Float & Clear ---
  'float': ['left', 'right', 'none', 'inline-start', 'inline-end'],
  'clear': ['none', 'left', 'right', 'both', 'inline-start', 'inline-end'],
  
  // --- Layout: Overflow ---
  'overflow': ['visible', 'hidden', 'clip', 'scroll', 'auto'],
  'overflow-x': ['visible', 'hidden', 'clip', 'scroll', 'auto'],
  'overflow-y': ['visible', 'hidden', 'clip', 'scroll', 'auto'],
  'visibility': ['visible', 'hidden', 'collapse'],
  'box-sizing': ['content-box', 'border-box'],

  // --- Typography: Align & Decoration ---
  'text-align': [
    'start', 'end', 'left', 'right', 'center', 'justify', 'justify-all', 'match-parent'
  ],
  'text-decoration': ['none', 'underline', 'overline', 'line-through', 'blink'],
  'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase', 'full-width', 'full-size-kana'],
  'white-space': [
    'normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'
  ],
  'word-break': ['normal', 'break-all', 'keep-all', 'break-word'],
  'overflow-wrap': ['normal', 'break-word', 'anywhere'],

  // --- Typography: Font ---
  'font-weight': [
    'normal', 'bold', 'bolder', 'lighter', 
    '100', '200', '300', '400', '500', '600', '700', '800', '900'
  ],
  'font-style': ['normal', 'italic', 'oblique'],
  'font-variant': ['normal', 'small-caps'],

  // --- Visual: Cursor (Mouth-watering list!) ---
  'cursor': [
    'auto', 'default', 'none', 'context-menu', 'help', 'pointer', 'progress', 'wait', 
    'cell', 'crosshair', 'text', 'vertical-text', 'alias', 'copy', 'move', 'no-drop', 
    'not-allowed', 'grab', 'grabbing', 'all-scroll', 'col-resize', 'row-resize', 
    'n-resize', 'e-resize', 's-resize', 'w-resize', 'ne-resize', 'nw-resize', 
    'se-resize', 'sw-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize', 
    'zoom-in', 'zoom-out'
  ],

  // --- Visual: Background & Border ---
  'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round'],
  'background-attachment': ['scroll', 'fixed', 'local'],
  'background-size': ['auto', 'cover', 'contain'],
  'background-clip': ['border-box', 'padding-box', 'content-box', 'text'],
  'border-style': [
    'none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'
  ],
  
  // --- Visual: Colors (Basic Keywords) ---
  // (너무 많아서 기본 키워드만 넣고, Hex나 RGB는 직접 입력)
  'color': ['currentcolor', 'transparent', 'black', 'white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'gray'],
  'background-color': ['currentcolor', 'transparent', 'black', 'white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'gray'],

  // --- Visual: Effects ---
  'mix-blend-mode': [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 
    'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
  ],
  'backface-visibility': ['visible', 'hidden'],
  'pointer-events': ['auto', 'none', 'visiblePainted', 'visibleFill', 'visibleStroke', 'visible', 'painted', 'fill', 'stroke', 'all'],
  'user-select': ['auto', 'text', 'none', 'contain', 'all'],
  'resize': ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'],

  // --- Size Keywords ---
  'width': ['auto', 'fit-content', 'min-content', 'max-content', '100%', '100vw'],
  'height': ['auto', 'fit-content', 'min-content', 'max-content', '100%', '100vh'],
};


// =============================================================================
// 4. ALL CSS PROPERTIES (속성 키 목록 - 더 확장됨)
// =============================================================================
export const CSS_PROPERTIES = [
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear',
  'visibility', 'overflow', 'overflow-x', 'overflow-y', 'box-sizing', 'clip', 'clip-path',

  // Flexbox & Grid
  'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap',
  'justify-content', 'align-items', 'align-content', 'align-self', 'order', 'gap', 'row-gap', 'column-gap',
  'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows',
  'grid-column', 'grid-column-end', 'grid-column-gap', 'grid-column-start',
  'grid-row', 'grid-row-end', 'grid-row-gap', 'grid-row-start', 
  'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows',

  // Spacing & Size
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  
  // Typography
  'color', 'font', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
  'letter-spacing', 'line-height', 'text-align', 'text-decoration', 'text-indent', 'text-transform',
  'text-overflow', 'text-shadow', 'vertical-align', 'white-space', 'word-break', 'word-spacing', 'writing-mode',
  
  // Background & Border
  'background', 'background-attachment', 'background-color', 'background-image', 'background-position',
  'background-repeat', 'background-size', 'background-clip', 'background-origin',
  'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
  'border-color', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width',
  'border-right', 'border-right-color', 'border-right-style', 'border-right-width',
  'border-style', 'border-top', 'border-top-color', 'border-top-style', 'border-top-width', 'border-width',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width',

  // Animation & Transition
  'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function',
  'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode',
  'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function',
  'transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin', 'backface-visibility',

  // Misc
  'cursor', 'opacity', 'pointer-events', 'user-select', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'list-style', 'object-fit', 'object-position', 'resize', 'scroll-behavior', 'will-change', 'content'
].sort(); // 알파벳순 정렬
