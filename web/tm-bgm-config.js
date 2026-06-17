// @ts-check
// ============================================================
// Tianming BGM config
// Put audio files under assets/audio/bgm/ and list them here.
// Supported formats depend on Chromium/Electron: mp3, ogg, wav, m4a.
// ============================================================
(function(){
  window.TM_BGM_PLAYLIST_VERSION = 'theme-quartet-20260513';
  window.TM_BGM_DEFAULT_LOOP = 'sequence';
  window.TM_MENU_BGM = {
    id: 'tianming-hegui',
    title: '\u5929\u547D\u4F55\u5F52',
    meta: '\u542F\u52A8\u9875\u4E3B\u9898\u66F2',
    src: 'assets/audio/bgm/tianming-hegui.mp3'
  };
  window.TM_BGM_TRACKS = [
    {
      id: 'gucheng-junqi',
      title: '\u6545\u57CE\u519B\u65D7',
      meta: '\u4E3B\u9898\u66F2',
      src: 'assets/audio/bgm/gucheng-junqi.mp3'
    },
    {
      id: 'hanwei-fengyun',
      title: '\u6C49\u9B4F\u98CE\u4E91',
      meta: '\u4E3B\u9898\u66F2',
      src: 'assets/audio/bgm/hanwei-fengyun.mp3'
    },
    {
      id: 'changhe-zhangu',
      title: '\u957F\u6CB3\u6218\u9F13',
      meta: '\u4E3B\u9898\u66F2',
      src: 'assets/audio/bgm/changhe-zhangu.mp3'
    },
    {
      id: 'yunkai-wanli',
      title: '\u4E91\u5F00\u4E07\u91CC',
      meta: '\u4E3B\u9898\u66F2',
      src: 'assets/audio/bgm/yunkai-wanli.mp3'
    }
  ];
})();
