import AudioStore        from './lib/audiostore.js';
import StreamCoordinator from './lib/streamcoordinator.js';
import Player            from './lib/player.js';

const el       = document.querySelector('.player');
const ac       = new ( window.AudioContext || window.webkitAudioContext )();
const store    = new AudioStore( ac );
const logs     = document.querySelector('.logs');
const info     = console.info;

const urls = [
  'audio/thepretender.mp3',
  'audio/thepretender-low.mp3'
];

const streamer = new StreamCoordinator( urls, store );

console.info = str => {
  requestAnimationFrame( () => {
    const pre = document.createElement('pre');
    pre.textContent = `${ str }\n`;
    logs.appendChild( pre );
    logs.scrollTop = Math.pow( 2, 53 ) - 1;
    info.call( console, str );
  });
};

// initialize the database
store.init()
// load all audio assets
.then( () => streamer.load() )
// set up the player
.then( () => {
  window.player = new Player( el, streamer );

  // set up click handlers to toggle between streams
  const one = document.querySelector('#one');
  const two = document.querySelector('#two');

  one.addEventListener( 'change', onChange );
  two.addEventListener( 'change', onChange );

  onChange();

  function onChange() {
    if ( one.checked ) {
      console.info('soloing voice 1');
      streamer.solo( 0 );
    } else {
      console.info('soloing voice 2');
      streamer.solo( 1 );
    }
  }

});
