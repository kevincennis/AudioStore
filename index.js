const url      = 'audio/thepretender.mp3';
const el       = document.querySelector('.player');
const ac       = new AudioContext();
const store    = new AudioStore( ac );
const streamer = new Streamer( url, store );

store.init()
.then( () => streamer.load() )
.then( () => window.player = new Player( el, streamer ) );
