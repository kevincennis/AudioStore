const url      = 'audio/thepretender.mp3';
const el       = document.querySelector('.player');
const ac       = new ( window.AudioContext || window.webkitAudioContext )();
const store    = new AudioStore( ac );
const streamer = new Streamer( url, store );
const logs     = document.querySelector('.logs');
const info     = console.info;

console.info = str => {
  let txt = logs.textContent;
  txt += `${ str }\n`;
  logs.textContent = txt;
  logs.scrollTop = Math.pow( 2, 53 ) - 1;
  info.call( console, str );
};

store.init()
.then( () => streamer.load() )
.then( () => window.player = new Player( el, streamer ) );
