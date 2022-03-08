import AudioStore        from './lib/audiostore.js';
import StreamCoordinator from './lib/streamcoordinator.js';
import Player            from './lib/player.js';

const el    = document.querySelector('.player');
const ac    = new ( window.AudioContext || window.webkitAudioContext )();
const store = new AudioStore( ac );
const logs  = document.querySelector('.logs');
const fdrs  = document.querySelector('.faders');
const info  = console.info;

const urls = [
  'audio/1901_bass.mp3',
  'audio/1901_drumsleft.mp3',
  'audio/1901_drumsright.mp3',
  'audio/1901_gtr1.mp3',
  'audio/1901_gtr2.mp3',
  'audio/1901_keys.mp3',
  'audio/1901_leadvox.mp3',
  'audio/1901_siren.mp3',
  'audio/1901_synth1.mp3',
  'audio/1901_synth2.mp3',
  'audio/1901_triggers.mp3',
  'audio/1901_voxfx.mp3'
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
await store.init();
// load all audio assets
await streamer.load();
// set up the player
window.player = new Player( el, streamer );
window.player.seek( 3 );

urls.forEach( ( url, i ) => {
  const name = url.split('_').pop().split('.').shift();
  const inp  = document.createElement('input');
  const lab  = document.createElement('label');

  lab.textContent = name;

  inp.type = 'range';
  inp.min = 0;
  inp.max = 100;
  inp.value = 50;

  streamer.streamers[ i ].gain.gain.value = 0.5;

  inp.addEventListener( 'input', () => {
    streamer.streamers[ i ].gain.gain.value = inp.value / 100;
  });

  lab.appendChild( inp );
  fdrs.appendChild( lab );
});
